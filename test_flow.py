from playwright.sync_api import sync_playwright

def test_creation_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Create a quotation
        page.goto("http://localhost:3000/cotizaciones/nueva")
        page.get_by_placeholder("Nombre o IG...").fill("Roberto Sanchez")

        # Select required fields that were blocking submission
        page.locator("select[name='salesAssociateId']").select_option(index=1)
        page.locator("select[name='modelId']").select_option(index=1)

        # Add first stone
        page.get_by_role("button", name="Agregar Piedra").click()
        page.wait_for_selector("input[placeholder='Ej: AB018']")

        lot_input = page.locator("input[placeholder='Ej: AB018']").first
        lot_input.fill("AB018")
        lot_input.blur()

        qty_input = page.locator("input[type='number'][min='1']").first
        qty_input.fill("2")

        weight_input = page.locator("input[type='number'][step='0.01']").first
        weight_input.fill("0.5")

        # Add second stone
        page.get_by_role("button", name="Agregar Piedra").click()
        lot_inputs = page.locator("input[placeholder='Ej: AB018']")
        lot_input_2 = lot_inputs.nth(1)
        lot_input_2.fill("TU-B070")
        lot_input_2.blur()

        qty_inputs = page.locator("input[type='number'][min='1']")
        qty_input_2 = qty_inputs.nth(1)
        qty_input_2.fill("1")

        weight_inputs = page.locator("input[type='number'][step='0.01']")
        weight_input_2 = weight_inputs.nth(1)
        weight_input_2.fill("1.2")

        page.screenshot(path="/tmp/quotation_form.png")

        page.get_by_role("button", name="Crear Cotización").click()

        # Wait for redirect
        page.wait_for_url("**/cotizaciones/historial")
        page.wait_for_timeout(1000)

        # Take screenshot of history (shows Pending status and Folio)
        page.screenshot(path="/tmp/quotation_history.png")

        # 2. Archive flow
        page.get_by_role("button", name="Archivar").first.click()
        page.wait_for_timeout(1000)

        page.goto("http://localhost:3000/cotizaciones/historial?tab=archived")
        page.wait_for_timeout(1000)
        page.screenshot(path="/tmp/quotation_archived.png")

        # Unarchive
        page.get_by_role("button", name="Desarchivar").first.click()
        page.wait_for_timeout(1000)

        # 3. Conversion to order
        page.goto("http://localhost:3000/cotizaciones/historial")
        page.wait_for_timeout(1000)

        page.get_by_role("link", name="Convertir a Orden").first.click()
        page.wait_for_selector("text=Resumen de Cotización -")
        page.screenshot(path="/tmp/order_conversion.png")

        page.get_by_role("button", name="Generar Orden").click()
        page.wait_for_url("**/ordenes/produccion")
        page.wait_for_timeout(1000)
        page.screenshot(path="/tmp/order_production.png")

        browser.close()

if __name__ == "__main__":
    test_creation_flow()
