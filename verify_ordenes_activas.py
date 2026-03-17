import sys
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the root to seed the DB if necessary and then to the active orders page
            page.goto("http://localhost:3000/")
            page.wait_for_timeout(2000)

            page.goto("http://localhost:3000/ordenes/activas")
            page.wait_for_timeout(2000)

            # Take a full page screenshot
            page.screenshot(path="ordenes_activas_view.png", full_page=True)
            print("Screenshot saved to ordenes_activas_view.png")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify()
