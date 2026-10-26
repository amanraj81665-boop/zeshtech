"use strict";

const nodemailer = require("nodemailer");

const OWNER_EMAIL = process.env.ADMIN_EMAIL || "zishanshafique8@gmail.com";
const OWNER_PHONE = "917903746116"; // 7903746116

// Configure transporter
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    return nodemailer.createTransport({
      host: host || "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass }
    });
  }

  // Fallback to test/log transport if SMTP not yet configured in .env
  return {
    sendMail: async (options) => {
      console.log(`[EMAIL NOTIFICATION] (Simulated / Ready for SMTP) -> To: ${options.to} | Subject: ${options.subject}`);
      return { messageId: "simulated-" + Date.now() };
    }
  };
}

const transporter = createTransporter();

/**
 * Format WhatsApp message URL for owner
 */
function createWhatsAppOwnerAlertUrl(order) {
  const itemsList = (order.items || [])
    .map((item, idx) => `  ${idx + 1}. ${item.title || item.name} (x${item.quantity}) - ₹${item.price?.toLocaleString("en-IN") || ""}`)
    .join("\n");

  const address = order.shippingAddress
    ? `${order.shippingAddress.addressLine1 || ""}, ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""} ${order.shippingAddress.pincode || ""}`
    : "Store Pickup / Counter";

  const customerName = order.shippingAddress?.fullName || order.customerName || "Customer";
  const customerPhone = order.shippingAddress?.phone || order.customerPhone || "N/A";
  const paymentMethod = order.paymentMethod || order.paymentMode || "Cash on Delivery";
  const orderId = order.orderNumber || order._id || "N/A";
  const total = (order.totalAmount || 0).toLocaleString("en-IN");

  const utr = order.paymentDetails?.transactionId ? `\n🔢 *UPI UTR / Ref:* ${order.paymentDetails.transactionId}` : "";
  const upiInfo = (paymentMethod.includes("UPI") || paymentMethod.includes("PhonePe")) ? `\n📲 *UPI ID:* 9122846271-5@ybl` : "";

  const messageText = 
`🛍️ *NEW ORDER ALERT — ZESH TECH*
━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #${orderId}
👤 *Customer:* ${customerName}
📞 *Phone:* ${customerPhone}
📍 *Delivery Address:* ${address}
💳 *Payment Mode:* ${paymentMethod}${utr}${upiInfo}
━━━━━━━━━━━━━━━━━━━━
📋 *Ordered Items:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${total}
━━━━━━━━━━━━━━━━━━━━
⚡ *Action:* Please check PhonePe / verify in Owner Dashboard.`;

  return `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(messageText)}`;
}

/**
 * Send Email Notification to Owner
 */
async function sendOwnerOrderEmail(order) {
  try {
    const customerName = order.shippingAddress?.fullName || order.customerName || "Valued Customer";
    const customerPhone = order.shippingAddress?.phone || order.customerPhone || "N/A";
    const address = order.shippingAddress
      ? `${order.shippingAddress.addressLine1 || ""}, ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""} - ${order.shippingAddress.pincode || ""}`
      : "Counter Pickup";
    const orderNumber = order.orderNumber || String(order._id);
    const totalAmount = (order.totalAmount || 0).toLocaleString("en-IN");
    const paymentMethod = order.paymentMethod || "Cash on Delivery";

    const itemsRows = (order.items || []).map((it, i) => `
      <tr style="border-bottom: 1px solid #222e3f;">
        <td style="padding: 10px 8px; color: #f1f5f9;">${i + 1}. ${it.title || it.name}</td>
        <td style="padding: 10px 8px; text-align: center; color: #94a3b8;">${it.quantity}</td>
        <td style="padding: 10px 8px; text-align: right; color: #38bdf8; font-weight: 600;">₹${(it.price || 0).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0b111a; color: #f1f5f9; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0066ff 0%, #7928ca 100%); padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px; color: #ffffff;">ZESH TECH</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 2px;">LIVE THE FUTURE — ORDER NOTIFICATION</p>
        </div>

        <div style="padding: 24px;">
          <div style="background: #111a28; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Order Number: <strong style="color: #38bdf8; font-size: 15px;">#${orderNumber}</strong></p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Customer: <strong style="color: #f1f5f9;">${customerName}</strong></p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Phone: <strong style="color: #22c55e;">${customerPhone}</strong></p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">Delivery Address: <strong style="color: #cbd5e1;">${address}</strong></p>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">Payment Mode: <strong style="color: #fbbf24;">${paymentMethod}</strong></p>
          </div>

          <h3 style="margin: 20px 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Ordered Items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #1e293b; color: #64748b; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px; text-align: left;">Product</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 16px; margin-bottom: 24px;">
            <span style="font-size: 16px; font-weight: 600; color: #f1f5f9;">Total Order Amount:</span>
            <span style="font-size: 22px; font-weight: 700; color: #22c55e;">₹${totalAmount}</span>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5000/admin.html" style="background: #0066ff; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Open in Owner Dashboard →
            </a>
          </div>
        </div>

        <div style="background: #080d14; padding: 14px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
          ZESH TECH — Station Road, Bazidpur, Barh, Patna (Bihar) 803213 | Ph: 7903746116, 9122846271
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"ZESH TECH Store" <no-reply@zeshtech.com>`,
      to: OWNER_EMAIL,
      subject: `🚨 New Order #${orderNumber} received — ₹${totalAmount} (${customerName})`,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Owner email notification error:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOwnerOrderEmail,
  createWhatsAppOwnerAlertUrl,
  OWNER_PHONE,
  OWNER_EMAIL
};
