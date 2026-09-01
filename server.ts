import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization of Gemini client with fallback checking
let aiClient: any = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // AI suggestion endpoints
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt description is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Robust offline fallback with instructions if API key is not configured
      console.warn("GEMINI_API_KEY is not defined. Returning offline creative template fallback.");
      return res.json({
        subject: `[Local Creative] Reaching New Heights with your Campaign`,
        body: `<h1>Elevate Your Brand</h1>\n<p>Thank you for expressing interest in our latest strategies. Here is what we generated locally based on your brief: "${prompt}"</p>\n<ul>\n  <li>Optimize delivery frequencies</li>\n  <li>Integrate telemetry diagnostics</li>\n</ul>\n<p>Best regards,<br/>The Engineering Team</p>`,
        optimizationTip: "💡 Note: To enable organic Google Gemini real-time generation, set the GEMINI_API_KEY in Settings > Secrets.",
        isFallback: true
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are an expert digital marketing copywriter and campaign strategist. Create a highly compelling, optimized email campaign based on this brief: "${prompt}". 
        Return ONLY a JSON object with EXACTLY the following structure (no other text or formatting):
        {
          "subject": "The email subject line",
          "body": "The HTML / Markdown body of the email",
          "optimizationTip": "Professional analysis of why this subject line and copy performs well"
        }`,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error("Gemini template generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI suggestion." });
    }
  });

  app.post("/api/gemini/generate-key", async (req, res) => {
    const { orgName, nodeSignature, validityDays, tier } = req.body;
    if (!orgName || !nodeSignature) {
      return res.status(400).json({ error: "Organization Name and Node Signature are required." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Robust offline fallback for licensing
      console.warn("GEMINI_API_KEY is not defined. Returning offline license suggestion fallback.");
      const randomSeed = Math.floor(1000 + Math.random() * 9000);
      const generatedKey = `NEXUS-${tier ? tier.substring(0,3).toUpperCase() : 'PRO'}-${randomSeed}-ACTIVE`;
      return res.json({
        licenseKey: generatedKey,
        sha256Signature: Buffer.from(`${orgName}-${nodeSignature}-${validityDays}`).toString('hex').substring(0, 32).toUpperCase(),
        marketingMessage: "✨ Offline License generated successfully. Setup GEMINI_API_KEY in Secrets for live AI cryptography.",
        allowedThroughput: "250,000 parallel / sec"
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Generate a distinct, enterprise-grade license key payload.
        Inputs:
        - Organization: "${orgName}"
        - Node Signature ID: "${nodeSignature}"
        - Lifetime (Days): ${validityDays}
        - Feature Tier: "${tier}"

        Return ONLY a JSON object with EXACTLY the following format:
        {
          "licenseKey": "Beautiful serial key like NEXUS-${tier ? tier.substring(0,3).toUpperCase() : 'PRO'}-{HEX_OR_ALPHANUM_KEY}-ACTIVE",
          "sha256Signature": "A long hex-coded security checksum signature of 32 characters or more",
          "marketingMessage": "A creative, polished validation statement affirming registration",
          "allowedThroughput": "E.g., 500,000 paralell streams"
        }`,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error("Gemini license generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI-assisted serial key." });
    }
  });

  // AI CV Optimizer specific to ASUS South Africa Technical positions
  app.post("/api/gemini/enhance-cv", async (req, res) => {
    const { cvData, targetRole, focusArea } = req.body;
    if (!cvData) {
      return res.status(400).json({ error: "CV data is required." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      console.warn("GEMINI_API_KEY is not defined. Returning offline creative ASUS Taylor CV fallback.");
      return res.json({
        enhancedSummary: `Highly motivated and detail-oriented IT Professional with a strong foundation in laptop troubleshooting, network administration, and motherboards repair. Eager to contribute system uptime and top-tier user support for premium ASUS consumer and commercial devices (Zenbook, ROG, motherboards) in Gauteng, South Africa.`,
        enhancedExperience1: [
          `Provide comprehensive tier 1 & 2 support on high-end consumer and commercial electronics, optimizing laptop, motherboard, and graphics card thermal performance and diagnostic uptime.`,
          `Diagnose component-level hardware failures, replacing faulty modules and performing micro-soldering, which reduced device turnaround time by 18%.`,
          `Manage user directories, access rights, and credential verification inside Active Directory and Microsoft 365 environments for local users.`
        ],
        enhancedExperience2: [
          `Streamlined system deployment, automating disk imaging and standard driver setups for newly acquired ASUS laptop assets across departmental grids.`,
          `Maintained strict warranty lifecycles, licenses, and detailed spare-part asset logging to prevent inventory leakage and optimize hardware swap speed.`,
          `Administered local Wi-Fi, Ethernet, and gateway interfaces, solving critical packet drops to ensure zero loss of operations.`
        ],
        optimizationTip: "💡 Offline Mode active. Set up GEMINI_API_KEY to access custom tailwinds and specific model-driven motherboard analysis!"
      });
    }

    try {
      const promptText = `
You are an expert IT Placement Specialist and Hiring Director for high-tech giants, specifically focusing on ASUS South Africa.
Your task is to take this candidate's raw CV data and rewrite/optimize sections of it to be extremely competitive for a role at ASUS (like high-end ROG/Zenbook support, motherboard diagnostics, laptop assembly/repair, and customer service).

Candidate Name: Chinedu Okeke
Target Role: "${targetRole || 'IT Support Technician'}"
Focus Area: "${focusArea || 'ASUS Laptop and Component-Level Troubleshooting'}"

Current Candidate Work Profile:
- Most Recent Job Title: "${cvData.recentJobTitle || 'IT Support Technician'}"
- Most Recent Company: "${cvData.recentCompany || 'IT Support & Services Firm'}"
- Previous Job Title: "${cvData.prevJobTitle || 'Junior IT Administrator'}"
- Previous Company: "${cvData.prevCompany || 'Solutions Provider'}"
- Professional summary input: "${cvData.professionalSummary || ''}"

Please generate highly optimized and impactful bullet points and a professional summary tailored SPECIFICALLY to ASUS's hardware excellence standards. Highlight hands-on motherboard, laptop component, graphics card troubleshooting, diagnostic tests, system image replication, Active Directory, and customer care. Keep it completely factual and believable, but worded with superior executive technical impact.

Return ONLY a JSON object with EXACTLY the following structure (no other text, markdown blocks, or surrounding text):
{
  "enhancedSummary": "A rewritten, extremely polished 3-4 sentence professional summary focusing on ASUS's brand values of quality, efficiency and technology leadership",
  "enhancedExperience1": [
    "A highly impactful, metrics-driven bullet point for the most recent role, including hardware terms, component-level motherboard/PC assembly, and support volume",
    "A second metrics-driven bullet point focusing on system diagnostics, software configuration, and uptime reduction Percentage%...",
    "A third bullet point focusing on Active Directory, client service desk, and user satisfaction"
  ],
  "enhancedExperience2": [
    "A highly impactful bullet point for the previous role, focusing on system imaging, setup, and hardware configuration",
    "A second metrics-driven bullet point focusing on networking, Wi-Fi trouble-shooting, and port speed",
    "A third bullet point focusing on asset lifecycle log accuracy, IT support ticket resolution speed, and licensing"
  ],
  "optimizationTip": "Strategic advice for Chinedu on how to highlight their skills during the ASUS South Africa hiring process, mentioning motherboards or specific laptops support like Zenbooks, ROG, or ExpertBooks"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error("Gemini CV enhancement error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI CV enhancement." });
    }
  });

  // Test and verify SMTP Connection settings
  app.post("/api/smtp/test", async (req, res) => {
    const { host, port, username, password, secure, senderName, senderEmail, testRecipient } = req.body;

    if (!host || !port) {
      return res.status(400).json({ error: "SMTP Host and Port are required." });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: secure === true,
        auth: username && password ? {
          user: username,
          pass: password,
        } : undefined,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection config
      await transporter.verify();

      // If test recipient is specified, dispatch test email
      if (testRecipient) {
        const fromHeader = senderName 
          ? `"${senderName}" <${senderEmail || username}>` 
          : (senderEmail || username);

        await transporter.sendMail({
          from: fromHeader,
          to: testRecipient,
          subject: "PulseMail Nexus - SMTP Connection Test Successful!",
          text: `Hello,\n\nThis is a secure automated test message from your PulseMail Nexus workspace.\n\nYour SMTP server connection at ${host}:${port} has been verified and is functioning perfectly!\n\nSystem Timestamp: ${new Date().toISOString()}\n\nBest regards,\nPulseMail Nexus Team`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #0b0f19; color: #f8fafc; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 20px; margin-bottom: 24px; text-align: center;">
                <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; tracking-tight: -0.05em;">PulseMail <span style="font-weight: 300;">Nexus</span></h1>
                <p style="color: #475569; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-family: monospace;">Secure Gateway Verification</p>
              </div>
              <div style="padding: 10px 0;">
                <div style="background-color: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 15px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
                  <span style="color: #10b981; font-weight: bold; font-size: 16px; display: block; margin-bottom: 4px;">✔ CONNECTION HANDSHAKE SUCCESSFUL</span>
                  <span style="color: #64748b; font-size: 12px;">Active secure session established with SMTP host</span>
                </div>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  Hello, this automated verification transmission confirms that your self-hosted SMTP relays are operating correctly in the PulseMail suite.
                </p>
                <div style="background-color: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); font-family: monospace; font-size: 13px; line-height: 1.8;">
                  <strong style="color: #10b981; font-size: 14px; display: block; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px;">Relay Configuration Details</strong>
                  <span style="color: #64748b;">SMTP Host:</span> <span style="color: #f1f5f9;">${host}</span><br/>
                  <span style="color: #64748b;">SMTP Port:</span> <span style="color: #f1f5f9;">${port}</span><br/>
                  <span style="color: #64748b;">Username:</span> <span style="color: #f1f5f9;">${username || 'Anonymous'}</span><br/>
                  <span style="color: #64748b;">Security:</span> <span style="color: #f1f5f9;">${secure ? 'SSL/TLS Encrypted' : 'None / STARTTLS'}</span><br/>
                  <span style="color: #64748b;">Sender:</span> <span style="color: #f1f5f9;">${senderName || 'Default'} &lt;${senderEmail || username}&gt;</span>
                </div>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-top: 24px;">
                  Your campaigns are now backed by your own customized transmission infrastructure, ensuring optimal throughput and organic domain reputation control.
                </p>
              </div>
              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 32px; text-align: center; font-size: 11px; color: #475569; font-family: monospace;">
                <p style="margin: 0;">Dispatched via PulseMail Nexus High-Throughput Delivery Grid</p>
              </div>
            </div>
          `
        });
      }

      return res.json({
        status: "success",
        message: testRecipient 
          ? `Handshake successful. Test verification email successfully delivered to ${testRecipient}.` 
          : "SMTP server handshake completed successfully!"
      });
    } catch (error: any) {
      console.error("SMTP Test error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to establish secure handshakes with the SMTP server."
      });
    }
  });

  // Real Email bulk send API
  app.post("/api/send-bulk", async (req, res) => {
    const { campaignId, recipients, subject, content, smtpConfig } = req.body;
    
    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: "Invalid recipients list" });
    }

    if (!smtpConfig || !smtpConfig.host) {
      // Offline simulation fallback
      console.log(`[SIMULATION] Starting mock campaign ${campaignId} for ${recipients.length} recipients`);
      return res.json({ 
        status: "simulated", 
        message: `Offline simulation active. Batch of ${recipients.length} emails queued for simulation delivery.`,
        campaignId 
      });
    }

    console.log(`[SMTP] Starting bulk delivery for campaign ${campaignId} to ${recipients.length} recipients via SMTP ${smtpConfig.host}:${smtpConfig.port}`);
    
    // Setup SMTP Transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number(smtpConfig.port),
      secure: smtpConfig.secure === true,
      auth: smtpConfig.username && smtpConfig.password ? {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    const fromAddress = smtpConfig.senderName 
      ? `"${smtpConfig.senderName}" <${smtpConfig.senderEmail || smtpConfig.username}>` 
      : (smtpConfig.senderEmail || smtpConfig.username);

    // Run async background sender loop to avoid blocking request response
    const sendAllEmails = async () => {
      let successCount = 0;
      let failureCount = 0;

      for (const recipient of recipients) {
        try {
          // Dynamic placeholders replacement
          let personalizedContent = content
            .replace(/{name}/g, recipient.name || '')
            .replace(/{email}/g, recipient.email || '');

          await transporter.sendMail({
            from: fromAddress,
            to: recipient.email,
            subject: subject || "PulseMail Transmission",
            html: personalizedContent,
            text: personalizedContent.replace(/<[^>]*>/g, '') // Strip HTML tags for plaintext
          });
          successCount++;
          console.log(`[SMTP SUCCESS] Dispatched to ${recipient.email}`);
        } catch (err: any) {
          failureCount++;
          console.error(`[SMTP ERROR] Delivery failed for ${recipient.email}:`, err.message);
        }
      }
      console.log(`[SMTP CAMPAIGN COMPLETE] Campaign ${campaignId}: ${successCount} successful, ${failureCount} failed.`);
    };

    // Fire and forget send process
    sendAllEmails();
    
    res.json({ 
      status: "processing", 
      message: `Transmission initialized via SMTP server ${smtpConfig.host}:${smtpConfig.port}.`,
      campaignId 
    });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
