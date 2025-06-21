export default async ({ page }) => {
    try {
        const email = "[EMAIL]";
        const password = "[PASSWORD]";

        await page.setDefaultTimeout(1200000);
        await page.setDefaultNavigationTimeout(1200000);
        await page.goto("https://app.bchydro.com/BCHCustomerPortal/web/login.html");
        await page.waitForSelector("#email");
        await page.type("#email", email);
        await page.type("#password", password);
        await Promise.all([page.waitForNavigation(), page.click("#submit-button")]);
        
        // Load Main Page
        await page.waitForSelector("#detailCon:not([disabled])");
        const billData = await page.evaluate(() => {
            return {
                balance:  document.querySelector('.bill_amount')?.innerText.trim().replace('$', '') || null,
                due_date: document.querySelector('.due_date')?.innerText.trim().replace('Payment due:', '').trim() || null,
                
                last_bill_date: document.querySelector('.bill_date span')?.innerText.match(/(.+):/)[1] || null,
                last_bill_amount: document.querySelector('.bill_date span')?.innerText.match(/:\s*\$(.+)/)[1] || null,
            }
        });

        // Go to detailed consumption
        await Promise.all([page.waitForNavigation(), page.click("#detailCon")]);
        await page.waitForSelector("#tableBtnLabel");
        await page.click("#tableBtnLabel");
        await page.waitForSelector("table#consumptionTable");
        const consumptionData = await page.evaluate(() => {
            const billingPeriod = document.querySelector("span#titleDateRange")?.innerText.trim() || null;
            const costToDate = document.querySelector("div.bch-pb-progress-text")?.innerText.trim().replace("$", "").replace("*", "") || null;
            const projectedCost = document.querySelector("div.md-value")?.innerText.trim().replace("$", "") || null;
            const table = document.querySelector("table#consumptionTable");
            const rows = table.querySelectorAll("tr");
            const headers = [...rows[0].querySelectorAll("td")].map((th) => th.innerText.trim()).slice(1);
            
            let firstDate = null;
            let latestValidEntry = null;
            let currentConsumption = 0;
            for (let i = 1; i < rows.length; i++) {
                const cells = [...rows[i].querySelectorAll("td")].slice(1);
                const rowData = {};
                cells.forEach((cell, index) => {
                    rowData[headers[index]] = cell.innerText.trim();
                });
                if (rowData["Total kWh"] !== "N/A"){
                    currentConsumption += parseFloat(rowData["Total kWh"]?.replace(/[^0-9.]/g, ""));
                }
                if (rowData["Date"] && rowData["Total kWh"] !== "N/A" && rowData["Total cost"] !== "N/A") {
                    latestValidEntry = rowData;
                }
                if (i == 1) {
                    firstDate = rowData["Date"]; 
                }
            }
            return {
                cost_to_date: costToDate,
                projected_cost: projectedCost,

                current_billing_period: billingPeriod,
                current_consumption: currentConsumption,
                
                latest_date: latestValidEntry ? latestValidEntry["Date"] : firstDate,
                latest_daily_consumption_kwh: latestValidEntry ? latestValidEntry["Total kWh"] : 0,
                latest_daily_cost_dollars: latestValidEntry ? latestValidEntry["Total cost"].replace("$", "") : 0,
            };
        });

        // Navigate to Last Billing Period
        await page.waitForSelector("span#dateSelect-button");
        await page.click("span#dateSelect-button");

        await page.waitForSelector("div.ui-menu-item-wrapper");
        const options = await page.$$("div.ui-menu-item-wrapper");
        for (const option of options){
            const text = await page.evaluate(el => el.textContent, option);
            console.log(text);
            if (text.trim() === "Last billing period") {
                await option.click();
                break;
            }
        }
        await page.waitForSelector("table#consumptionTable");
        await page.waitForSelector("#titleDateRange");
        const lastBillData = await page.evaluate(() => {
            const lastBillingPeriod = document.querySelector("span#titleDateRange")?.innerText.trim() || null;
            const table = document.querySelector("table#consumptionTable");
            const rows = table.querySelectorAll("tr");
            const headers = [...rows[0].querySelectorAll("td")].map((th) => th.innerText.trim()).slice(1);
            
            let lastBillingPeriodConsumption = 0;
            for (let i = 1; i < rows.length; i++) {
                const cells = [...rows[i].querySelectorAll("td")].slice(1);
                const rowData = {};
                cells.forEach((cell, index) => {
                    rowData[headers[index]] = cell.innerText.trim();
                });
                if (rowData["Total kWh"] !== "N/A"){
                    lastBillingPeriodConsumption += parseFloat(rowData["Total kWh"]?.replace(/[^0-9.]/g, ""));
                }
            }
            return {
                last_billing_period: lastBillingPeriod,
                last_billing_period_consumption: lastBillingPeriodConsumption,
            };
        });

        const result = { ...billData, ...consumptionData, ...lastBillData, 
            last_run: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) 
        };
        return result;
    } catch (error) {
        return { error: error.message };
    }
};
