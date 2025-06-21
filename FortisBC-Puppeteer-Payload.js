export default async ({ page }) => {
    try {
        const username = "[USERNAME]";
        const password = "[PASSWORD]";
        
        await page.setDefaultTimeout(1200000);
        await page.setDefaultNavigationTimeout(1200000);
        await page.goto("https://www.fortisbc.com/accountonline");
        await page.waitForSelector("#user");
        await page.type("#user", username);
        await page.type("#password", password);
        await Promise.all([
            page.waitForNavigation(),
            page.click('input[title="Account login"]')
        ]);

        // Wait for landing page to load and 
        await page.waitForSelector('.bill-section');
        await page.waitForSelector('span.text-ahead');
        const billData = await page.evaluate(() => {
            return {
                balance: document.querySelector('span.text-ahead')?.innerText.trim().replace(/[^0-9.]/g, "") || null,
                
                last_bill_amount: document.querySelector('.bill-section .last-bill .currency')?.innerText.trim().replace(/[^0-9.]/g, "") || null,
                due_date: document.querySelector('.bill-section .last-bill div:nth-of-type(2)')?.innerText.trim().replace('Due on', '').trim() || null,

                next_bill_date: document.querySelector('.bill-section .next-bill .currency')?.innerText.trim() || null,
                next_bill_date_countdown: document.querySelector('.bill-section .next-bill div:nth-of-type(2)')?.innerText.trim() || null,

                last_payment_amount: document.querySelector('.bill-section .last-payment .currency')?.innerText.trim().replace(/[^0-9.]/g, "") || null,
                last_payment_date: document.querySelector('.bill-section .last-payment div:nth-of-type(2)')?.innerText.trim().replace('On', '').trim() || null,
            };
        });

        // Navigate to consumption history
        await Promise.all([
            page.click('[title="View consumption history"]'),
            page.waitForNavigation() // No parameters, using default behavior
        ]);

        // Wait for the consumption history table (id starts with "consumptionHistory") to load
        await page.waitForSelector("table[id^='consumptionHistory']");

        // Extract consumption details from the first row of the table
        const consumptionData = await page.evaluate(() => {
            const table = document.querySelector("table[id^='consumptionHistory']");
            if (!table) return {};
            const firstRow = table.querySelector("tbody tr");
            if (!firstRow) return {};
            const cells = firstRow.querySelectorAll("td");

            const lastBillingPeriod = (cells[0] && cells[1]) ? `${cells[0].innerText.trim()} - ${cells[1].innerText.trim()}` : null;

            return {
                last_billing_period: lastBillingPeriod,
                last_billing_period_number_of_days: cells[2] ? cells[2].innerText.trim() : null,
                last_billing_period_consumption: cells[3] ? cells[3].innerText.trim() : null,
                last_billing_period_avg_temperature: cells[4] ? cells[4].innerText.trim() : null,

                last_run: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
            };
        });
        const result = { ...billData, ...consumptionData };       
        return result;
    } catch (error) {
        return { error: error.message };
    }
};
