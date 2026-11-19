"""Daily sync: download the current month's SEACE V3 JSON bulk file from the
OECE open-contracting portal and save it to data/raw/.

Must run with a HEADED (non-headless) Chromium — the site blocks headless
browsers at the application level (confirmed: identical requests get 200 OK
headed / are never served headless). It does not need a human present; it
can run unattended via Windows Task Scheduler, it just needs a real (not
headless) browser process.
"""
import datetime
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

now = datetime.datetime.now()
year, month = now.year, now.month


def sync_month(year: int, month: int) -> Path:
    """Download the month's bulk file (served as a ZIP despite the .JSON
    link label) and return the path to the extracted .json file."""
    url = "https://contratacionesabiertas.oece.gob.pe/descargas"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(url, wait_until="load", timeout=30000)

        href_fragment = f"/api/v1/file/seace_v3/json/{year}/{month:02d}"
        link = page.locator(f"a[href*='{href_fragment}']").first
        link.wait_for(state="visible", timeout=45000)

        with page.expect_download(timeout=60000) as download_info:
            link.click()
        download = download_info.value

        zip_path = RAW_DIR / f"seace_v3_{year}_{month:02d}.zip"
        download.save_as(zip_path)
        browser.close()

    with zipfile.ZipFile(zip_path) as z:
        inner_name = z.namelist()[0]
        json_path = RAW_DIR / f"seace_v3_{year}_{month:02d}.json"
        with z.open(inner_name) as src, open(json_path, "wb") as dst:
            dst.write(src.read())

    zip_path.unlink()
    return json_path


if __name__ == "__main__":
    dest = sync_month(year, month)
    print(f"OK: {dest} ({dest.stat().st_size} bytes)")
