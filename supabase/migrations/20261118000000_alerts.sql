-- Alerts: rubros catalog, alert profiles per organization, notification channels and
-- matches. Matching runs in SQL so n8n (today) or apps/jobs (later) only has to call
-- refresh_alert_matches() after each sync and read pending_alert_notifications.

create table public.unspsc_families (
    code         text primary key check (code ~ '^[0-9]{4}$'),
    description  text not null,
    tender_count int  not null default 0
);

create table public.alert_profiles (
    id                   uuid primary key default gen_random_uuid(),
    organization_id      uuid not null references public.organizations (id) on delete cascade,
    name                 text not null check (char_length(name) between 2 and 80),
    business_description text not null check (char_length(business_description) between 10 and 1000),
    unspsc_families      text[] not null check (cardinality(unspsc_families) between 1 and 10),
    departments          text[] not null default '{}', -- empty = todo el Perú
    min_amount           numeric check (min_amount >= 0),
    max_amount           numeric check (max_amount >= 0),
    status               text not null default 'active' check (status in ('active', 'paused')),
    created_by           uuid references auth.users (id) on delete set null,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    check (min_amount is null or max_amount is null or min_amount <= max_amount)
);

create index alert_profiles_organization_idx on public.alert_profiles (organization_id);
create index alert_profiles_families_idx on public.alert_profiles using gin (unspsc_families);

create trigger alert_profiles_set_updated_at before update on public.alert_profiles
    for each row execute function public.set_updated_at();

create table public.notification_settings (
    organization_id    uuid primary key references public.organizations (id) on delete cascade,
    email_enabled      boolean not null default true,
    whatsapp_enabled   boolean not null default false,
    whatsapp_phone     text check (whatsapp_phone ~ '^\+519[0-9]{8}$'),
    whatsapp_opt_in_at timestamptz, -- consent record required by Meta and Ley 29733
    digest_hour        int not null default 7 check (digest_hour between 5 and 20),
    updated_at         timestamptz not null default now(),
    check (not whatsapp_enabled or (whatsapp_phone is not null and whatsapp_opt_in_at is not null))
);

create trigger notification_settings_set_updated_at before update on public.notification_settings
    for each row execute function public.set_updated_at();

create table public.alert_matches (
    id              bigint generated always as identity primary key,
    profile_id      uuid not null references public.alert_profiles (id) on delete cascade,
    organization_id uuid not null references public.organizations (id) on delete cascade,
    ocid            text not null references public.tenders (ocid) on delete cascade,
    matched_at      timestamptz not null default now(),
    notified_at     timestamptz, -- set by the sender; a notified match is never sent again
    unique (profile_id, ocid)
);

create index alert_matches_organization_idx on public.alert_matches (organization_id, matched_at desc);
create index alert_matches_pending_idx on public.alert_matches (organization_id) where notified_at is null;

-- Matching -----------------------------------------------------------------

-- The one definition of "this tender fits this profile", shared by the preview and
-- the daily refresh. Amount 0/null means "not priced yet", so ranges don't hide it.
create function public.tender_fits_profile(
    t public.tenders,
    families text[],
    departments text[],
    min_amount numeric,
    max_amount numeric
) returns boolean
language sql immutable
set search_path = ''
as $$
    select t.unspsc_family = any (families)
       and (cardinality(departments) = 0 or t.department = any (departments))
       and (min_amount is null or t.amount is null or t.amount = 0 or t.amount >= min_amount)
       and (max_amount is null or t.amount is null or t.amount = 0 or t.amount <= max_amount);
$$;

-- "Esto te habría llegado": SECURITY INVOKER, so the tenders RLS policy applies and
-- only organizations with an active subscription see results.
create function public.preview_alert_profile(
    p_families text[],
    p_departments text[],
    p_min_amount numeric,
    p_max_amount numeric,
    p_days int default 30
) returns table (
    ocid text,
    title text,
    buyer_name text,
    department text,
    amount numeric,
    currency text,
    date_published timestamptz,
    enquiry_end timestamptz,
    unspsc_description text
)
language sql stable
set search_path = ''
as $$
    select t.ocid, t.title, t.buyer_name, t.department, t.amount, t.currency,
           t.date_published, t.enquiry_end, t.unspsc_description
    from public.tenders t
    where public.tender_fits_profile(t, p_families, p_departments, p_min_amount, p_max_amount)
      and t.date_published >= now() - make_interval(days => p_days)
    order by t.date_published desc
    limit 50;
$$;

-- Run after every sync. Idempotent: ON CONFLICT skips pairs that already exist, so a
-- tender is matched (and later notified) once per profile.
create function public.refresh_alert_matches(days_back int default 35) returns int
language plpgsql
set search_path = ''
as $$
declare
    inserted_count int;
begin
    insert into public.alert_matches (profile_id, organization_id, ocid)
    select p.id, p.organization_id, t.ocid
    from public.alert_profiles p
    join public.subscriptions s
      on s.organization_id = p.organization_id
     and s.status in ('trial', 'active')
     and now() >= s.starts_at and now() < s.ends_at
    join public.tenders t
      on public.tender_fits_profile(t, p.unspsc_families, p.departments, p.min_amount, p.max_amount)
    where p.status = 'active'
      and t.date_published >= now() - make_interval(days => days_back)
    on conflict (profile_id, ocid) do nothing;

    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

create function public.alert_profile_quota(org uuid)
returns table (max_profiles int, used int)
language sql stable
set search_path = ''
as $$
    select pl.max_alert_profiles,
           (select count(*)::int from public.alert_profiles ap where ap.organization_id = org)
    from public.subscriptions s
    join public.plans pl on pl.code = s.plan_code
    where s.organization_id = org;
$$;

-- What the sender (n8n today) reads every morning: one row per pending match, with the
-- organization's channels. Not exposed to customers.
create view public.pending_alert_notifications
with (security_invoker = true) as
select m.id              as match_id,
       m.organization_id,
       o.name            as organization_name,
       coalesce(ns.email_enabled, true)     as email_enabled,
       coalesce(ns.whatsapp_enabled, false) as whatsapp_enabled,
       ns.whatsapp_phone,
       coalesce(ns.digest_hour, 7)          as digest_hour,
       p.name            as profile_name,
       t.ocid, t.title, t.buyer_name, t.department, t.amount, t.currency,
       t.enquiry_end, t.date_published,
       m.matched_at
from public.alert_matches m
join public.organizations o on o.id = m.organization_id
join public.alert_profiles p on p.id = m.profile_id
join public.tenders t on t.ocid = m.ocid
left join public.notification_settings ns on ns.organization_id = m.organization_id
where m.notified_at is null;

-- Privileges ---------------------------------------------------------------

revoke execute on function
    public.tender_fits_profile(public.tenders, text[], text[], numeric, numeric),
    public.preview_alert_profile(text[], text[], numeric, numeric, int),
    public.refresh_alert_matches(int),
    public.alert_profile_quota(uuid)
from public, anon;

grant execute on function
    public.tender_fits_profile(public.tenders, text[], text[], numeric, numeric),
    public.preview_alert_profile(text[], text[], numeric, numeric, int),
    public.alert_profile_quota(uuid)
to authenticated;

grant execute on function public.refresh_alert_matches(int) to service_role;

grant select on public.unspsc_families to authenticated;
grant select, insert, update, delete on public.alert_profiles to authenticated;
grant select, insert, update on public.notification_settings to authenticated;
grant select on public.alert_matches to authenticated;

grant select, insert, update, delete on
    public.unspsc_families, public.alert_profiles, public.notification_settings, public.alert_matches
to service_role;
grant select on public.pending_alert_notifications to service_role;

revoke all on
    public.unspsc_families, public.alert_profiles, public.notification_settings,
    public.alert_matches, public.pending_alert_notifications
from anon;
revoke all on public.pending_alert_notifications from authenticated;

-- RLS ----------------------------------------------------------------------

alter table public.unspsc_families enable row level security;
alter table public.alert_profiles enable row level security;
alter table public.notification_settings enable row level security;
alter table public.alert_matches enable row level security;

create policy unspsc_families_select on public.unspsc_families
    for select to authenticated using (true);

create policy alert_profiles_select on public.alert_profiles
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy alert_profiles_write on public.alert_profiles
    for all to authenticated
    using (public.is_platform_admin() or public.has_org_role(organization_id, array['owner', 'admin']))
    with check (public.is_platform_admin() or public.has_org_role(organization_id, array['owner', 'admin']));

create policy notification_settings_select on public.notification_settings
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy notification_settings_write on public.notification_settings
    for all to authenticated
    using (public.is_platform_admin() or public.has_org_role(organization_id, array['owner', 'admin']))
    with check (public.is_platform_admin() or public.has_org_role(organization_id, array['owner', 'admin']));

create policy alert_matches_select on public.alert_matches
    for select to authenticated
    using (public.is_org_member(organization_id) or public.is_platform_admin());

-- Catalog: the 389 UNSPSC families seen in SEACE data, with how often each appears
-- (4-digit codes only; a few segment-level entries in the source are skipped).
-- Generated from data/unspsc_catalog.json.
insert into public.unspsc_families (code, description, tender_count) values
    ('7214', 'Servicios de mantenimiento de pistas y carreteras', 6439),
    ('1510', 'Diesel', 4372),
    ('8110', 'Ingeniería arquitectónica', 4083),
    ('7212', 'Servicios de construcción de escuelas', 2639),
    ('3011', 'Cemento', 2597),
    ('8013', 'Alquiler de instalaciones comerciales o industriales', 2457),
    ('7215', 'Servicios de construcción de campos deportivos interiores', 1834),
    ('9210', 'Servicios de vigilancia', 1537),
    ('8010', 'Administración o planificación de proyectos', 1529),
    ('5013', 'Leche o productos de mantequilla estables sin refrigerar', 1366),
    ('9111', 'Servicios de cocina o preparación de comidas', 1143),
    ('7710', 'Servicios de control de calidad ambiental', 1135),
    ('8312', 'Servicios relacionados con Internet', 876),
    ('7811', 'Alquiler de vehículos', 760),
    ('7611', 'Servicios de limpieza de edificios', 602),
    ('5022', 'Granos de cereal', 498),
    ('7810', 'Servicios de transporte regional o nacional en camión', 456),
    ('5019', 'Papas fritas en hojuelas y al hilo, mix de bocaditos o galletas saladas', 414),
    ('2510', 'Camiones ligeros o vehículos de utilidad deportiva', 349),
    ('3012', 'Asfalto', 321),
    ('8014', 'Gestión de eventos', 312),
    ('1111', 'Grava', 309),
    ('3010', 'Varillas de hierro', 309),
    ('8111', 'Servicio de licencias para software de computadoras', 283),
    ('9315', 'Gestión de inversiones públicas o presupuestarias', 279),
    ('8311', 'Servicios de telefonía móvil', 274),
    ('7711', 'Servicios de descontaminación ambiental', 270),
    ('8210', 'Publicidad en Internet', 265),
    ('8212', 'Impresión tipográfica o serigrafía', 259),
    ('8516', 'Mantenimiento o reparación de bienes de equipo médico', 252),
    ('7818', 'Reparación y mantenimiento de camión ligero automotriz', 251),
    ('7315', 'Servicio de reparación y mantenimiento de equipo eléctrico', 232),
    ('8114', 'Servicio de inspección de instalaciones sanitarias o alcantarillado', 224),
    ('5012', 'Pescado estable sin refrigerar', 221),
    ('4111', 'Accesorios o suministros de analizadores de banco de sangre', 216),
    ('7612', 'Disposición final para desechos peligrosos', 196),
    ('1511', 'Gas de petróleo licuefactado', 195),
    ('7210', 'Reparación o mantenimiento del sistema de plomería', 195),
    ('3013', 'Ladrillos de cerámica', 177),
    ('8411', 'Servicio de contabilidad de inventarios', 165),
    ('5310', 'Uniformes', 164),
    ('4017', 'Tubería comercial de PVC', 162),
    ('8011', 'Desarrollo de gestión', 156),
    ('8116', 'Servicio de arrendamiento o alquiler de plataforma o equipo de comunicación de datos', 156),
    ('1010', 'Ganado vacuno', 149),
    ('8610', 'Desarrollo de fuerza de trabajo del sector administrativo', 145),
    ('2611', 'Generadores diesel', 143),
    ('5512', 'Tarjetas o carnets de identificación o productos similares', 142),
    ('4220', 'Unidades de ecografía o ecografía de pulso o doppler o ultrasonido médico para uso diagnóstico general', 140),
    ('8310', 'Servicios de transmisión de energía eléctrica', 133),
    ('7814', 'Servicios de expedición de carga', 132),
    ('9012', 'Agencias de viajes', 129),
    ('8016', 'Servicios de oficina', 128),
    ('8512', 'Servicios de laboratorios de radiografías', 128),
    ('4321', 'Servidor de computadora', 122),
    ('1015', 'Semillas o plántulas de césped', 118),
    ('4227', 'Cilindros de gas médicos o dispositivos relacionados', 118),
    ('8510', 'Servicio para administrar consultorios médicos', 118),
    ('5011', 'Pollo mínimamente procesado sin aditivos', 114),
    ('9011', 'Hoteles', 114),
    ('8012', 'Servicios de investigación legal', 113),
    ('8413', 'Seguro de vida', 112),
    ('5015', 'Aceites comestibles vegetales o de plantas', 108),
    ('4010', 'Aires acondicionados y accesorios', 105),
    ('4222', 'Kits o accesorios de bombas de infusión', 102),
    ('1012', 'Alimentación compuesta', 100),
    ('2411', 'Bolsas de plástico', 100),
    ('8115', 'Levantamiento del terreno', 100),
    ('5510', 'Publicaciones periodicas', 98),
    ('2517', 'Neumáticos para camiones pesados', 94),
    ('1235', 'Sales metálicas inorgánicas', 91),
    ('2410', 'Compactador estacionario para basura', 90),
    ('2110', 'Trituradoras de martillo', 88),
    ('2711', 'Segadora de césped', 86),
    ('4710', 'Digestores de lodos o aguas residuales', 85),
    ('1112', 'Madera tornillo', 84),
    ('3026', 'Lámina de acero corrugado', 84),
    ('7017', 'Servicios de administración de sistemas de riego', 83),
    ('7610', 'Servicios de desinfección o deodorización', 82),
    ('8412', 'Servicios de custodia de valores', 81),
    ('9314', 'Servicios de seguridad o salud ocupacional', 80),
    ('9510', 'Granja', 79),
    ('2210', 'Retroexcavadoras', 78),
    ('1214', 'Cloro (Cl)', 76),
    ('4223', 'Fórmulas suplementarias de adulto para uso general', 74),
    ('5020', 'Agua', 74),
    ('9512', 'Parque', 74),
    ('8612', 'Programas de postgrado', 73),
    ('4213', 'Uniformes para el personal médico', 72),
    ('2513', 'Aviones objetivo o de reconocimiento', 71),
    ('4218', 'Unidades o accesorios de signos vitales multiparámetros', 69),
    ('5016', 'Azúcares naturales o productos edulcorantes', 69),
    ('7011', 'Servicios de gestión o mantenimiento de parques', 69),
    ('5311', 'Zapatos para caballero', 67),
    ('3017', 'Puertas de madera', 65),
    ('1512', 'Aceite de motor', 63),
    ('3912', 'Fuente de energía ininterrumpida UPS', 62),
    ('2612', 'Cable de cobre', 61),
    ('5119', 'Electrolitos de cloruro de sodio', 61),
    ('4323', 'Software de protección antivirus y de seguridad de transacciones', 60),
    ('4110', 'Concentradores de vacío o centrífugos', 59),
    ('8414', 'Proveedores de servicios de tarjetas de crédito', 58),
    ('1017', 'Mezclas Nitrógeno Fósforo Potasio', 57),
    ('4322', 'Equipo de acceso satelital', 57),
    ('5199', 'Medicamentos y productos farmacéuticos', 57),
    ('5612', 'Escritorios para estudiantes', 57),
    ('1411', 'Formularios o cuestionarios comerciales', 56),
    ('7211', 'Servicios de remodelación de dormitorios colectivos', 54),
    ('3015', 'Techado prearmado', 53),
    ('8213', 'Servicios de producción de videos', 52),
    ('8410', 'Asistencia financiera', 50),
    ('4618', 'Botas de seguridad', 49),
    ('4229', 'Accesorios de depósito de autotransfusión', 47),
    ('7015', 'Servicios de administración forestal', 47),
    ('5120', 'Gamma IGG o immunoglobulina', 46),
    ('1019', 'Insecticidas', 45),
    ('4016', 'Filtros de aceite', 45),
    ('7813', 'Almacenamiento de muebles', 45),
    ('8515', 'Servicios de análisis de alimentos', 45),
    ('8614', 'Servicios de biblioteca o documentación', 45),
    ('3016', 'Pisos de caucho', 44),
    ('5610', 'Escritorios', 44),
    ('9313', 'Servicios de suministro de alimentos', 44),
    ('4219', 'Camas de cuidado del paciente o accesorios de uso general', 43),
    ('4912', 'Carpas', 43),
    ('5212', 'Frazadas', 43),
    ('4810', 'Molinos de alimentos de uso comercial', 42),
    ('2312', 'Maquinaria para bordados', 41),
    ('7314', 'Servicios de costura industrial', 41),
    ('1310', 'Caucho procesado y sintético', 40),
    ('4215', 'Unidades de curación de laboratorio dental', 40),
    ('4216', 'Soluciones para diálisis peritoneal', 40),
    ('4228', 'Esterilizadores o autoclaves de vapor', 40),
    ('5313', 'Productos para la protección contra el sol', 40),
    ('7013', 'Análisis de fertilidad del suelo', 40),
    ('7318', 'Servicios de fresado químico', 40),
    ('1216', 'Aditivo de concreto', 39),
    ('5113', 'Albúmina humana', 39),
    ('5312', 'Mochilas', 39),
    ('4214', 'Jeringas médicas con aguja', 38),
    ('4224', 'Dispositivos prostéticos de la extremidad inferior', 38),
    ('7316', 'Servicios de fabricación de aeronaves o naves espaciales', 38),
    ('2610', 'Motor fuera de borda a gasolina', 37),
    ('4015', 'Bombas sumergibles', 36),
    ('5216', 'Televisores', 36),
    ('7299', 'Servicios de Construcción y Mantenimiento', 36),
    ('7899', 'Servicios de Transporte, Almacenaje y Correo', 35),
    ('3121', 'Pinturas al esmalte', 34),
    ('4617', 'Grabadoras de sonido o video de vigilancia', 34),
    ('7712', 'Servicios de tratamiento de aguas superficiales', 34),
    ('1116', 'Tejidos de lana de ligamento de sarga', 33),
    ('2613', 'Conmutadores de control de carga de subestación', 32),
    ('5114', 'Valproato sódico', 32),
    ('1013', 'Jaulas o sus accesorios', 31),
    ('1219', 'Solventes activos', 31),
    ('4512', 'Videocámaras o cámaras de video digitales', 31),
    ('5118', 'Insulina', 31),
    ('8017', 'Servicio de asesoría y relaciones con los medios de comunicación', 31),
    ('4713', 'Productos de lavandería (Cloro, Detergente, Suavizante)', 30),
    ('7812', 'Carga y descarga de mercancías', 30),
    ('3018', 'Inodoros', 29),
    ('5042', 'Lentejas secas', 29),
    ('6014', 'Juegos educativos', 29),
    ('5611', 'Asientos de auditorio, estadio o de uso especial', 28),
    ('3115', 'Cable de acero no eléctrico', 27),
    ('3910', 'Lámpara cialítica de cirugía que no produce sombra', 27),
    ('4014', 'Mangueras especiales', 27),
    ('2511', 'Barco de personal de gas o petróleo', 26),
    ('3116', 'Gavión', 26),
    ('8613', 'Servicio de entrenamiento ejecutivo', 26),
    ('2519', 'Sistemas de ensayo o mantenimiento de apoyo terrestre', 25),
    ('4212', 'Productos formadores de sangre o sangre para uso veterinario', 25),
    ('7014', 'Servicios de secadoras de granos', 24),
    ('7110', 'Servicios de voladura de mina', 24),
    ('4410', 'Tóner para impresora o fax', 23),
    ('5018', 'Pan fresco', 23),
    ('9212', 'Servicios de vigilantes', 22),
    ('1113', 'Semen', 21),
    ('3911', 'Iluminación para pistas y carreteras', 21),
    ('4231', 'Apósitos de película transparente', 21),
    ('4511', 'Sistemas de videoconferencia', 21),
    ('5111', 'Trastuzumab', 21),
    ('8211', 'Servicios de redacción de manuales', 21),
    ('8215', 'Servicios de escultores', 21),
    ('2413', 'Congeladores verticales', 20),
    ('3022', 'Estructuras Permanentes', 20),
    ('5121', 'Iopamidol', 20),
    ('5214', 'Moledoras de café domésticas', 20),
    ('7116', 'Servicios de base costera', 20),
    ('6012', 'Carteles', 19),
    ('8214', 'Servicios de edición de gráficos o diseños', 19),
    ('7312', 'Servicios de corte de metales', 18),
    ('1016', 'Cacaos', 17),
    ('3210', 'Circuito integrado de procesador de video o medios de comunicación', 17),
    ('4217', 'Desfibriladores externos automatizados (DEA) o paletas rígidas', 17),
    ('4411', 'Organizadores o cajas de almacenamiento de archivos', 17),
    ('7115', 'Backup y almacenamiento de datos', 17),
    ('4112', 'Tubos de ensayo multipropósito o generales', 16),
    ('4232', 'Prótesis para hemiartroplastía de cadera de una pieza', 16),
    ('4619', 'Extintores', 16),
    ('4712', 'Bolsas de basura', 16),
    ('5117', 'Magaldrato', 16),
    ('5147', 'Gluconato de clorhexidina', 16),
    ('2012', 'Sistemas de topografía', 15),
    ('4018', 'Sistema de tuberías de plástico PAD', 15),
    ('5110', 'Amoxicilina', 15),
    ('9513', 'Oficina de emplazamiento', 15),
    ('1115', 'Hebras de lana', 14),
    ('2412', 'Sacos para empaquetado', 14),
    ('3120', 'Adhesivos químicos', 14),
    ('4225', 'Aparatos de terapia ultrasónica o suministros', 14),
    ('4320', 'Unidades de discos duros', 14),
    ('4910', 'Medallas', 14),
    ('6010', 'Materiales de apoyo de la unidad temática', 14),
    ('2315', 'Maquinaria de formar, rellenar o sellar', 13),
    ('4924', 'Toboganes para parques infantiles', 13),
    ('5050', 'Suplemento multivitaminico', 13),
    ('5115', 'Bromhidrato de escopolamina', 13),
    ('7010', 'Servicios de investigación o experimentación pesquera', 13),
    ('3126', 'Cubiertas y cajas metálicas', 12),
    ('3215', 'Caja de distribución eléctrica para sistema de control', 12),
    ('8015', 'Servicios de información comercial', 12),
    ('9317', 'Procedimientos o políticas de comercio mundial', 12),
    ('9413', 'Servicios no gubernamentales de asistencia técnica', 12),
    ('1011', 'Tazones y equipos para comida de animales domésticos', 11),
    ('2318', 'Maquinaria para la elaboración de alimentos', 11),
    ('3019', 'Caseta de obra', 11),
    ('4811', 'Máquinas dispensadoras de productos en envases pequeños o snacks', 11),
    ('5124', 'Calamina/fenol/óxido de zinc', 11),
    ('5137', 'Buprenorfina', 11),
    ('5141', 'Alteplasa', 11),
    ('5614', 'Bol de metal', 11),
    ('7012', 'Nutrición de animales', 11),
    ('8611', 'Enseñanza de idiomas extranjeros por inmersión', 11),
    ('2316', 'Calderos de fundición', 10),
    ('4230', 'Modelos anatómicos humanos para educación o capacitación médica', 10),
    ('4616', 'Señales de trafico (vallas, anuncios)', 10),
    ('5138', 'Acetaminofen', 10),
    ('2111', 'Redes para pesca comercial', 9),
    ('2310', 'Maquinaria para trabajar madera, piedra, cerámica y similares', 9),
    ('2327', 'Máquina de Soldadura Ultrasónica por fusión', 9),
    ('4610', 'Municiones para defensa u orden público', 9),
    ('4711', 'Lavadoras tipo lavandería', 9),
    ('5010', 'Nueces y semillas enteras', 9),
    ('5213', 'Cortinas', 9),
    ('6013', 'Trompetas', 9),
    ('7016', 'Servicios de manejo de ecosistemas marinos', 9),
    ('7112', 'Servicios de mantenimiento de tubos del yacimiento petrolero', 9),
    ('9310', 'Servicios de estadistas', 9),
    ('2014', 'Tanque colector de plástico', 8),
    ('2414', 'Sellos de seguridad o a prueba de entremetido', 8),
    ('2712', 'Prensa hidráulica industrial', 8),
    ('4319', 'Teléfonos móviles', 8),
    ('4412', 'Bolígrafos', 8),
    ('4615', 'Barreras', 8),
    ('5040', 'Cebollas rojas', 8),
    ('5116', 'Poractant alfa', 8),
    ('5144', 'Gadolinio', 8),
    ('5613', 'Canastas de productos', 8),
    ('8112', 'Análisis macroeconómico', 8),
    ('9014', 'Eventos deportivos profesionales patrocinados por la empresa', 8),
    ('9514', 'Garita de vigilancia', 8),
    ('2324', 'Máquina de aserrar y trocear', 7),
    ('2518', 'Remolques de plataforma', 7),
    ('3140', 'Juegos de juntas troqueladas', 7),
    ('3141', 'Sello mecánico de fuelle', 7),
    ('4920', 'Máquinas de ejercicios múltiples', 7),
    ('5112', 'Losartán potásico', 7),
    ('7613', 'Limpieza de derrames de sustancias toxicas', 7),
    ('2011', 'Equipo de perforación de pozos de agua', 6),
    ('2311', 'Maquinaria para destilación de crudo', 6),
    ('2314', 'Equipo para talleres de trabajo en cuero', 6),
    ('2320', 'Equipo de secado industrial', 6),
    ('2713', 'Juego de herramientas neumáticas', 6),
    ('3118', 'Prensaestopas', 6),
    ('4916', 'Balones de fútbol', 6),
    ('4922', 'Colchonetas o almohadillas deportivas', 6),
    ('5127', 'Remifentanilo', 6),
    ('5128', 'Ceftazidima', 6),
    ('7311', 'Servicios de fabricación de muebles', 6),
    ('2516', 'Bicicletas', 5),
    ('2520', 'Sistemas de extinción o de Control de incendios de aeronaves', 5),
    ('3014', 'Ladrillos aislantes térmicos', 5),
    ('3117', 'Rodamientos de bolas', 5),
    ('3125', 'Actuadores eléctricos', 5),
    ('3212', 'Inversores', 5),
    ('5017', 'Especias o extractos', 5),
    ('5030', 'Naranjas valencia', 5),
    ('5126', 'Tamsulosina', 5),
    ('5134', 'Aciclovir o aciclovir', 5),
    ('5142', 'Budesonida', 5),
    ('5511', 'Libros en cinta o disco compacto', 5),
    ('7111', 'Servicios de video de fondo de pozo del registro de producción', 5),
    ('7317', 'Servicios de fabricación de equipos fotográficos u ópticos', 5),
    ('9211', 'Defensa civil', 5),
    ('9312', 'Servicios de terceros en las negociaciones o demandas territoriales', 5),
    ('9316', 'Sistemas tributarios', 5),
    ('1311', 'Polietileno de baja densidad lineal', 4),
    ('2010', 'Cribas', 4),
    ('2325', 'Troquel para estampado', 4),
    ('3024', 'Tabla base para tribuna y accesorios', 4),
    ('3119', 'Cuentas de vidrio', 4),
    ('3913', 'Accesorio de conducto eléctrico', 4),
    ('4119', 'Procesador de tejidos automatizado', 4),
    ('4221', 'Audifono para personas con problemas auditivos', 4),
    ('4226', 'Transportadores de cadáveres', 4),
    ('4514', 'Fijador', 4),
    ('5129', 'Aripiprazol', 4),
    ('5130', 'Posaconazol', 4),
    ('5140', 'Olanzapina', 4),
    ('5143', 'Atomoxetina', 4),
    ('5146', 'Condroitina/glucosamina/hialuronato', 4),
    ('5215', 'Cuchillos panaderos', 4),
    ('9010', 'Servicios de reparto de comidas y bebidas', 4),
    ('9015', 'Servicio de asistencia personal', 4),
    ('9299', 'Servicios de Defensa Nacional, Orden Público y Seguridad', 4),
    ('9511', 'Calle o avenida o carretera o bulevar', 4),
    ('1412', 'Papel de seda Kraft', 3),
    ('2313', 'Alisadoras de ruedas de esmerilar', 3),
    ('2322', 'Aturdidor', 3),
    ('2323', 'Rodillo de fijación', 3),
    ('2330', 'Equipo para montaje de terminales y corte de cables y alambres', 3),
    ('3137', 'Ladrillos moldeados', 3),
    ('4510', 'Consumibles para impresión offset', 3),
    ('4622', 'Dispositivo antimanipulación de minas', 3),
    ('4914', 'Instrumentos o accesorios para buceo', 3),
    ('4921', 'Equipos de orientación', 3),
    ('5133', 'Clorpromazina', 3),
    ('5135', 'Estradiol/hidroxiprogesterona', 3),
    ('5145', 'Albendazol', 3),
    ('7713', 'Servicios de control de ruidos', 3),
    ('8113', 'Análisis multivariado', 3),
    ('8526', 'Diagnóstico de Sobrecarga de líquidos', 3),
    ('1014', 'Sillas de montar', 2),
    ('1020', 'Rosal vivo fragancia púrpura', 2),
    ('1021', 'Retama viva escocesa amarilla', 2),
    ('1031', 'Azucena agua fresca cortada', 2),
    ('1110', 'Carbón activado', 2),
    ('1213', 'Bengalas', 2),
    ('1217', 'Colorantes fdc seguros para alimentos, fármacos o cosméticos', 2),
    ('1218', 'Aceites sintéticos', 2),
    ('2328', 'Máquina de calefacción por inducción', 2),
    ('2614', 'Plomo para blindaje contra la radiación', 2),
    ('3128', 'Componentes laminados compuestos', 2),
    ('3133', 'Conjuntos estructurales de latón con acabado ligado', 2),
    ('3211', 'Transistor bipolar o de radiofrecuencia bipolar', 2),
    ('3213', 'Soportes o zócalos de circuito integrado', 2),
    ('4099', 'Sistemas, Equipos y Componentes de Distribución y Acondicionamiento', 2),
    ('4120', 'Ensayo de endotoxinas', 2),
    ('4614', 'Lanzadores de cohetes', 2),
    ('4812', 'Ruletas', 2),
    ('4917', 'Barras de equilibrio para gimnasia', 2),
    ('5038', 'Purés de aceituna sevillano', 2),
    ('5139', 'Albuterol', 2),
    ('5210', 'Alfombras sintéticas', 2),
    ('5410', 'Pulseras', 2),
    ('9410', 'Asociaciones de abogados', 2),
    ('9412', 'Servicios de promotores o gestores de clubes deportivos', 2),
    ('1034', 'Ramo de peonia, clavel y rosa frescas cortadas', 1),
    ('1050', 'Acacia púrpura fresca cortada', 1),
    ('1114', 'Desperdicios o restos de caucho', 1),
    ('2013', 'Arenas de fracturamiento cubiertas de resina', 1),
    ('2319', 'Mezcladora de arena', 1),
    ('2321', 'Sistema de marcación de panel de circuito impreso', 1),
    ('2515', 'Estructuras de naves espaciales', 1),
    ('3122', 'Extractos inorgánicos para curtidos', 1),
    ('3123', 'Metal precioso en barra mecanizada', 1),
    ('3124', 'Bóvedas de policarbonato moldeado', 1),
    ('3131', 'Conjuntos de tubería de acero al carbono de soldadura sónica', 1),
    ('3136', 'Conjuntos de placas de aluminio soldados o soldados en fuerte', 1),
    ('4118', 'Sistema de prueba inmunológica de autoanticuerpos contra la tiroides', 1),
    ('4513', 'Cintas de video en blanco', 1),
    ('4611', 'Granadas', 1),
    ('5043', 'Arvejas orgánicas secas de jardín', 1),
    ('5131', 'Bosentan', 1),
    ('5132', 'Ciprofibrato', 1),
    ('5314', 'Agujas de crochet', 1),
    ('6011', 'Botones decorativos', 1),
    ('7113', 'Servicios de bombeo de fondo de pozo', 1),
    ('7310', 'Servicios de fabricación de plásticos, resinas o fibras', 1),
    ('8511', 'Servicios de control o prevención de enfermedades coronarias', 1),
    ('8513', 'Servicios de investigación genética', 1),
    ('8517', 'Excavación de tumbas', 1),
    ('9013', 'Conciertos', 1),
    ('9110', 'Alquiler de disfraces', 1);
