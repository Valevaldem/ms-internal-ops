import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Go to history...")
        await page.goto("http://localhost:3000/cotizaciones/historial")

        # Open detail page of the newest quote
        print("Opening quote detail...")
        await page.click("table tbody tr:first-child td:first-child a")
        await page.wait_for_load_state('networkidle')

        print("Checking default status...")
        status = await page.input_value("select")
        print(f"Current Status: {status}")

        print("Capturing detail screenshot before change...")
        await page.screenshot(path="detail_before.png", full_page=True)

        print("Changing status...")
        await page.select_option("select", "En seguimiento")
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(1000)

        print("Capturing detail screenshot after change...")
        await page.screenshot(path="detail_after.png", full_page=True)

        await page.goto("http://localhost:3000/cotizaciones/historial")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="history.png", full_page=True)

        print("Verification successful!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
