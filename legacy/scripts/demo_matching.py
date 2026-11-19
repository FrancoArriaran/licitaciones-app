"""Demo: given a mype profile, show what the WhatsApp bot would surface.
This is the core value-prop query the whole pipeline exists to serve."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "tenders.db"


def match(conn, department, unspsc_families, min_amount, max_amount, limit=5):
    placeholders = ",".join("?" * len(unspsc_families))
    sql = f"""
        SELECT title, buyer_name, procurement_method, amount, enquiry_end, unspsc_description
        FROM tenders
        WHERE department = ?
          AND unspsc_family IN ({placeholders})
          AND amount BETWEEN ? AND ?
        ORDER BY date_published DESC
        LIMIT ?
    """
    return conn.execute(sql, [department, *unspsc_families, min_amount, max_amount, limit]).fetchall()


if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)

    print("=== Perfil demo: mype de mantenimiento de vias/pistas en AREQUIPA, capacidad hasta S/150,000 ===\n")
    # Familia 7215 = mantenimiento de pistas/losas deportivas (subset de servicios de construccion/mantenimiento)
    rows = match(conn, "AREQUIPA", ["7215", "7214"], 1000, 150000)
    for r in rows:
        print(f"- {r[0]}\n  Entidad: {r[1]} | {r[2]} | S/ {r[3]:,.2f} | Plazo consultas hasta: {r[4]}\n  Rubro: {r[5]}\n")

    print("\n=== Perfil demo: mype de hardware/redes de computo en LIMA, capacidad hasta S/80,000 ===\n")
    # Familia 4321 = hardware de computo, 4322 = equipo de redes
    rows = match(conn, "LIMA", ["4321", "4322"], 1000, 80000)
    for r in rows:
        print(f"- {r[0]}\n  Entidad: {r[1]} | {r[2]} | S/ {r[3]:,.2f} | Plazo consultas hasta: {r[4]}\n  Rubro: {r[5]}\n")

    conn.close()
