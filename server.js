const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const { jsPDF } = require('jspdf'); // Use node-jspdf
require('jspdf-autotable');

const app = express();
const stripe = Stripe('sk_test_YOUR_SECRET_KEY'); // Your Stripe secret key

app.use(bodyParser.json());

let emailStore = {}; // Temporary storage to associate email with payment

// Save user email before Stripe payment
app.post('/create-session', (req, res) => {
  const email = req.body.email;
  // Associate with a temporary ID or metadata if needed
  emailStore[email] = true;
  res.status(200).send({ status: 'email saved' });
});

// Stripe Webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      'whsec_YOUR_WEBHOOK_SECRET' // your Stripe webhook signing secret
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details.email;

    if (emailStore[email]) {
      console.log("✅ Payment confirmed for:", email);
      await generateAndSendPDF(email);
      delete emailStore[email]; // Optional cleanup
    }
  }

  res.status(200).end();
});

// Function to generate PDF and email it
async function generateAndSendPDF(email) {
  const doc = new jsPDF();
  const vocabulary = [
    ['able', 'capaz'],
    ['air', 'ar'],
    ['airport', 'aeroporto'],
    // Add all words from all lists
  ];

  doc.setFontSize(16);
  doc.text("Complete English - Brazilian Portuguese Vocabulary", 14, 20);
  doc.autoTable({
    head: [['English', 'Portuguese (Brazil)']],
    body: vocabulary,
    startY: 30,
  });

  const pdfPath = path.join(__dirname, 'vocabulary.pdf');
  doc.save(pdfPath);

  // Send via email
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your_email@gmail.com',
      pass: 'your_app_password', // Use App Password, not your Gmail password
    },
  });

  let mailOptions = {
    from: '"Vocabulary Team" <your_email@gmail.com>',
    to: email,
    subject: 'Your Vocabulary PDF',
    text: 'Thank you for your purchase! Please find the vocabulary PDF attached.',
    attachments: [{ filename: 'vocabulary.pdf', path: pdfPath }],
  };

  await transporter.sendMail(mailOptions);
  console.log('📧 PDF sent to:', email);
}

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
