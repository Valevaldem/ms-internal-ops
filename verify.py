import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Step 1: Create a quotation with discount
        print("Navigating to new quotation...")
        await page.goto("http://localhost:3000/cotizaciones/nueva")

        await page.fill("input[name='clientNameOrUsername']", "Test Client Discount")
        await page.select_option("select[name='salesAssociateId']", index=1)
        await page.select_option("select[name='modelId']", index=1)

        print("Adding stone...")
        await page.click("text=Agregar Piedra")
        await page.fill("input[name='stones.0.lotCode']", "D-001")
        await page.click("body") # unfocus to trigger blur
        await page.wait_for_timeout(500)
        await page.fill("input[name='stones.0.weightCt']", "1.5")
        await page.click("body") # unfocus
        await page.wait_for_timeout(500)

        print("Applying discount...")
        await page.fill("input[name='discountPercent']", "10")
        await page.click("body")
        await page.wait_for_timeout(500)

        print("Submitting quotation...")
        await page.click("button:has-text('Crear Cotización')")

        print("Waiting for redirect to history...")
        await page.wait_for_url("**/cotizaciones/historial**", timeout=10000)

        print("Capturing history screenshot...")
        await page.screenshot(path="history.png")

        # Open detail page of the newest quote
        print("Opening quote detail...")
        await page.click("table tbody tr:first-child td:first-child a")
        await page.wait_for_load_state('networkidle')

        print("Checking default status...")
        status = await page.input_value("select")
        print(f"Current Status: {status}")

        print("Capturing detail screenshot before change...")
        await page.screenshot(path="detail_before.png")

        print("Changing status...")
        await page.select_option("select", "En seguimiento")
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(1000)

        print("Capturing detail screenshot after change...")
        await page.screenshot(path="detail_after.png")

        print("Verification successful!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
