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
        await page.click("button:has-text('Agregar Piedra')")

        # We need to wait for the element to appear
        await page.wait_for_selector("input[name='stones.0.lotCode']")
        await page.fill("input[name='stones.0.lotCode']", "D-001")
        # trigger blur to load stone
        await page.evaluate("document.querySelector(\"input[name='stones.0.lotCode']\").dispatchEvent(new Event('blur', {bubbles: true}))")

        await page.wait_for_timeout(1000)

        await page.fill("input[name='stones.0.weightCt']", "1.5")

        # trigger change
        await page.evaluate("document.querySelector(\"input[name='stones.0.weightCt']\").dispatchEvent(new Event('change', {bubbles: true}))")

        await page.wait_for_timeout(1000)

        print("Applying discount...")
        await page.fill("input[name='discountPercent']", "10")

        print("Taking pre-submit screenshot...")
        await page.screenshot(path="pre_submit.png")

        print("Submitting quotation...")
        await page.click("button:has-text('Crear Cotización')")

        print("Waiting for redirect to history...")
        await page.wait_for_url("**/cotizaciones/historial**", timeout=5000)

        print("Verification successful!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
