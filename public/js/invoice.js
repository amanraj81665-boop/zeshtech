"use strict";
(async function () {
  const root = document.getElementById("invoice-content");
  const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
  const invoiceNumber = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
  try {
    const response = await fetch("/api/bills/public/" + encodeURIComponent(invoiceNumber), { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (!response.ok || !result.success || !result.invoice) throw new Error(result.message || "Invoice not found");
    const bill = result.invoice;
    const date = bill.date ? new Date(bill.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";
    const rows = (bill.items || []).map(item => `
      <tr><td>${safe(item.name)}<div class="muted" style="font-size:12px">HSN: ${safe(item.hsn || "—")}</div></td>
      <td class="num">${Number(item.quantity) || 0}</td><td class="num">${money(item.price)}</td><td class="num">${money(item.total)}</td></tr>`).join("");
    root.innerHTML = `
      <div class="meta"><div><div class="muted">INVOICE NUMBER</div><strong>${safe(bill.invoiceNumber)}</strong></div><div><div class="muted">INVOICE DATE</div><strong>${safe(date)}</strong></div></div>
      <div class="table-wrap"><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No items found</td></tr>'}</tbody></table></div>
      <div class="totals">
        <div class="line"><span class="muted">Taxable value</span><strong>${money(bill.taxableValue)}</strong></div>
        <div class="line"><span class="muted">CGST</span><strong>${money(bill.cgst)}</strong></div>
        <div class="line"><span class="muted">SGST</span><strong>${money(bill.sgst)}</strong></div>
        <div class="line"><span class="muted">Discount</span><strong>−${money(bill.discount)}</strong></div>
        <div class="line grand"><span>Grand total</span><span>${money(bill.grandTotal)}</span></div>
      </div>
      <p class="muted" style="font-size:12px;margin-top:24px">This is a digital summary of the invoice. For assistance, contact ZESH TECH.</p>`;
  } catch (error) {
    root.innerHTML = '<div class="notice error"><strong>Invoice unavailable</strong><p>' + safe(error.message || "Please check the QR code or contact the store.") + '</p></div>';
  }
})();