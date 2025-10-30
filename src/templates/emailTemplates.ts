export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  generateHTML: (content: NewsletterContent) => string;
}

export interface NewsletterContent {
  header: {
    title: string;
    subtitle?: string;
    date: string;
    logoUrl?: string;
  };
  sections: Array<{
    title: string;
    content: string;
    imageUrl?: string;
  }>;
  footer?: {
    text?: string;
    unsubscribeUrl?: string;
    links?: Array<{ text: string; url: string }>;
  };
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const baseEmailStyles = `
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; border-spacing: 0; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  p { margin: 0; padding: 0; }
`;

const classicTemplate: EmailTemplate = {
  id: 'classic',
  name: 'Classic Newsletter',
  description: 'Clean, professional layout with centered content and clear hierarchy',
  generateHTML: (content: NewsletterContent) => {
    const primaryColor = content.brandColors?.primary || '#2563eb';
    const textColor = '#1f2937';
    const mutedColor = '#6b7280';

    const sectionsHTML = content.sections.map((section) => `
      <tr>
        <td style="padding: 0 0 32px 0;">
          ${section.imageUrl ? `
            <img src="${section.imageUrl}" alt="${section.title}" style="width: 100%; max-width: 600px; height: auto; display: block; border-radius: 8px; margin-bottom: 16px;" />
          ` : ''}
          <h2 style="margin: 0 0 16px 0; color: ${textColor}; font-size: 22px; font-weight: 600; line-height: 1.3;">${section.title}</h2>
          <div style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0;">${section.content}</div>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style type="text/css">
    ${baseEmailStyles}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb);">
              ${content.header.logoUrl ? `
                <img src="${content.header.logoUrl}" alt="Logo" style="display: block; width: auto; height: 48px; margin: 0 auto 16px;" />
              ` : ''}
              <h1 style="margin: 0 0 8px 0; color: ${textColor}; font-size: 28px; font-weight: 700; line-height: 1.2;">${content.header.title}</h1>
              ${content.header.subtitle ? `
                <p style="margin: 0 0 8px 0; color: ${mutedColor}; font-size: 16px; line-height: 1.5;">${content.header.subtitle}</p>
              ` : ''}
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">${new Date(content.header.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${sectionsHTML}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0 0 16px 0; color: ${mutedColor}; font-size: 14px; line-height: 1.5;">
                ${content.footer?.text || 'Thank you for reading!'}
              </p>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="${content.footer?.unsubscribeUrl || '#'}" style="color: ${mutedColor}; text-decoration: none; font-size: 13px;">Unsubscribe</a>
                  </td>
                  <td style="padding: 0 10px; color: #d1d5db;">|</td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="color: ${mutedColor}; text-decoration: none; font-size: 13px;">Privacy Policy</a>
                  </td>
                  <td style="padding: 0 10px; color: #d1d5db;">|</td>
                  <td style="padding: 0 10px;">
                    <a href="#" style="color: ${mutedColor}; text-decoration: none; font-size: 13px;">Contact</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  },
};

const modernTemplate: EmailTemplate = {
  id: 'modern',
  name: 'Modern & Bold',
  description: 'Eye-catching design with vibrant colors and contemporary styling',
  generateHTML: (content: NewsletterContent) => {
    const primaryColor = content.brandColors?.primary || '#3b82f6';
    const accentColor = content.brandColors?.accent || '#8b5cf6';
    const textColor = '#111827';

    const sectionsHTML = content.sections.map((section) => `
      <tr>
        <td style="padding: 0 0 40px 0;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 0 0 0 4px; border-left: 4px solid ${primaryColor};">
                <h2 style="margin: 0 0 16px 0; padding-left: 12px; color: ${textColor}; font-size: 24px; font-weight: 700; line-height: 1.2;">${section.title}</h2>
              </td>
            </tr>
          </table>
          ${section.imageUrl ? `
            <img src="${section.imageUrl}" alt="${section.title}" style="width: 100%; max-width: 600px; height: auto; display: block; border-radius: 12px; margin: 16px 0;" />
          ` : ''}
          <div style="color: ${textColor}; font-size: 16px; line-height: 1.7; margin: 0;">${section.content}</div>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style type="text/css">
    ${baseEmailStyles}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 48px 30px; background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); border-radius: 12px 12px 0 0;">
              ${content.header.logoUrl ? `
                <img src="${content.header.logoUrl}" alt="Logo" style="display: block; width: auto; height: 56px; margin: 0 auto 20px;" />
              ` : ''}
              <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 32px; font-weight: 800; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${content.header.title}</h1>
              ${content.header.subtitle ? `
                <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 18px; line-height: 1.5;">${content.header.subtitle}</p>
              ` : ''}
              <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 14px;">${new Date(content.header.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 48px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${sectionsHTML}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 30px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ${content.footer?.text || 'Thank you for being part of our community!'}
              </p>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 12px;">
                    <a href="${content.footer?.unsubscribeUrl || '#'}" style="color: #6b7280; text-decoration: none; font-size: 13px; font-weight: 500;">Unsubscribe</a>
                  </td>
                  <td style="padding: 0 8px; color: #d1d5db;">•</td>
                  <td style="padding: 0 12px;">
                    <a href="#" style="color: #6b7280; text-decoration: none; font-size: 13px; font-weight: 500;">Privacy</a>
                  </td>
                  <td style="padding: 0 8px; color: #d1d5db;">•</td>
                  <td style="padding: 0 12px;">
                    <a href="#" style="color: #6b7280; text-decoration: none; font-size: 13px; font-weight: 500;">Contact</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  },
};

const minimalistTemplate: EmailTemplate = {
  id: 'minimalist',
  name: 'Minimalist',
  description: 'Clean and simple design focusing on content with minimal distractions',
  generateHTML: (content: NewsletterContent) => {
    const accentColor = content.brandColors?.accent || '#059669';
    const textColor = '#374151';

    const sectionsHTML = content.sections.map((section, index) => `
      <tr>
        <td style="padding: 0 0 40px 0;">
          ${section.imageUrl ? `
            <img src="${section.imageUrl}" alt="${section.title}" style="width: 100%; max-width: 600px; height: auto; display: block; margin-bottom: 20px;" />
          ` : ''}
          <h2 style="margin: 0 0 16px 0; color: ${textColor}; font-size: 20px; font-weight: 600; line-height: 1.4; border-bottom: 2px solid ${accentColor}; padding-bottom: 8px; display: inline-block;">${section.title}</h2>
          <div style="color: ${textColor}; font-size: 16px; line-height: 1.8; margin: 16px 0 0 0;">${section.content}</div>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style type="text/css">
    ${baseEmailStyles}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 60px 20px 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td align="left" style="padding: 0 0 48px 0; border-bottom: 1px solid #e5e7eb;">
              ${content.header.logoUrl ? `
                <img src="${content.header.logoUrl}" alt="Logo" style="display: block; width: auto; height: 40px; margin: 0 0 24px 0;" />
              ` : ''}
              <h1 style="margin: 0 0 8px 0; color: ${textColor}; font-size: 32px; font-weight: 700; line-height: 1.2;">${content.header.title}</h1>
              ${content.header.subtitle ? `
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">${content.header.subtitle}</p>
              ` : ''}
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">${new Date(content.header.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 48px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${sectionsHTML}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 0 0 0; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ${content.footer?.text || ''}
              </p>
              <p style="margin: 0; color: #d1d5db; font-size: 12px;">
                <a href="${content.footer?.unsubscribeUrl || '#'}" style="color: #9ca3af; text-decoration: none;">Unsubscribe</a>
                <span style="margin: 0 8px;">|</span>
                <a href="#" style="color: #9ca3af; text-decoration: none;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  },
};

export const emailTemplates: EmailTemplate[] = [
  classicTemplate,
  modernTemplate,
  minimalistTemplate,
];

export const getTemplateById = (id: string): EmailTemplate | undefined => {
  return emailTemplates.find(template => template.id === id);
};

export const getDefaultTemplate = (): EmailTemplate => {
  return classicTemplate;
};
