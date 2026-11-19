-- Jobs that replace n8n (apps/jobs) connect with the secret key (service_role), not
-- as the table owner like n8n did. They already have the table privileges; what
-- was missing is the functions they call after each sync:
--   * refresh_tender_matches: matching for the n8n prototype profiles.
--   * tender_fits_profile: used inside refresh_alert_matches (security invoker),
--     so without it the customer matching fails with "permission denied".
grant execute on function
    public.refresh_tender_matches(int),
    public.tender_fits_profile(public.tenders, text[], text[], numeric, numeric)
to service_role;
