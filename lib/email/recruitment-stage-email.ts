import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

export const recruitmentStages = [
  "applied",
  "initial_review",
  "ai_screening",
  "interview",
  "hired",
] as const;

export type RecruitmentStage = (typeof recruitmentStages)[number];

type StageEmailInput = {
  applicationId: string;
  applicationReference: string;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  stage: RecruitmentStage;
};

type StageEmailResult =
  | { sent: true }
  | { sent: false; reason: string };

type SmtpConfiguration = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

const stageContent: Record<
  RecruitmentStage,
  { label: string; subject: string; message: string }
> = {
  applied: {
    label: "Applied",
    subject: "Application received",
    message:
      "Your application has been received and is now in our application queue.",
  },
  initial_review: {
    label: "Initial review",
    subject: "Your application is under review",
    message:
      "Our recruitment team has moved your application to initial review.",
  },
  ai_screening: {
    label: "AI screening",
    subject: "Application screening update",
    message:
      "Your application has moved to assisted screening. The screening result supports our recruiters, and all hiring decisions remain under human review.",
  },
  interview: {
    label: "Interview",
    subject: "Your application has moved to interview",
    message:
      "Your application has advanced to the interview stage. Our recruitment team will contact you with scheduling details.",
  },
  hired: {
    label: "Hired",
    subject: "Application status update",
    message:
      "Congratulations! Your application has moved to the hired stage. Our recruitment team will contact you with the next onboarding steps.",
  },
};

let transporter: Transporter | undefined;
let transporterKey = "";

export async function sendRecruitmentStageEmail(
  input: StageEmailInput,
): Promise<StageEmailResult> {
  const configuration = getSmtpConfiguration();
  if (!configuration) {
    return {
      sent: false,
      reason: "Recruitment email delivery is not configured.",
    };
  }

  const content = stageContent[input.stage];
  const safeName = escapeHtml(input.applicantName);
  const safeJob = escapeHtml(input.jobTitle);
  const safeReference = escapeHtml(input.applicationReference);
  const safeMessage = escapeHtml(content.message);

  try {
    await getTransporter(configuration).sendMail({
      from: configuration.from,
      to: input.applicantEmail,
      subject: `${content.subject} - ${input.jobTitle}`,
      text: [
        `Hello ${input.applicantName},`,
        "",
        content.message,
        "",
        `Position: ${input.jobTitle}`,
        `Current stage: ${content.label}`,
        `Application reference: ${input.applicationReference}`,
        "",
        "Regards,",
        "Scim-Inventory Recruitment Team",
      ].join("\n"),
      html: `
        <div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#10213d">
          <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #dbe7f6;border-radius:16px;overflow:hidden">
            <div style="background:#155eef;padding:24px 28px;color:#fff">
              <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">Scim-Inventory Recruitment</div>
              <h1 style="font-size:24px;line-height:1.25;margin:10px 0 0">Application update</h1>
            </div>
            <div style="padding:28px">
              <p style="font-size:16px;line-height:1.7;margin:0 0 16px">Hello ${safeName},</p>
              <p style="font-size:16px;line-height:1.7;margin:0 0 24px">${safeMessage}</p>
              <div style="background:#f6f9ff;border:1px solid #dbe7f6;border-radius:12px;padding:18px">
                <p style="margin:0 0 8px"><strong>Position:</strong> ${safeJob}</p>
                <p style="margin:0 0 8px"><strong>Current stage:</strong> ${escapeHtml(content.label)}</p>
                <p style="margin:0"><strong>Reference:</strong> ${safeReference}</p>
              </div>
              <p style="font-size:14px;line-height:1.6;color:#63708a;margin:24px 0 0">This is an automated status notification. Our recruitment team will contact you if additional information is required.</p>
            </div>
          </div>
        </div>`,
    });

    return { sent: true };
  } catch (error) {
    console.error("Recruitment stage email failed", error);
    return { sent: false, reason: "SMTP email delivery failed." };
  }
}

function getSmtpConfiguration(): SmtpConfiguration | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.replace(/\s/g, "");
  const from = process.env.SMTP_FROM?.trim() || user;
  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    !user ||
    !password ||
    !from
  )
    return null;

  return {
    host,
    port,
    secure:
      process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || port === 465,
    user,
    password,
    from,
  };
}

function getTransporter(configuration: SmtpConfiguration) {
  const key = `${configuration.host}:${configuration.port}:${configuration.user}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      auth: {
        user: configuration.user,
        pass: configuration.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    transporterKey = key;
  }
  return transporter;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}
