import { type Metadata } from "next";
import { LegalLayout } from "~/app/_components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy - Swole Tracker",
  description: "Privacy Policy for Swole Tracker",
};

const privacyContent = `# Privacy Policy

**Effective Date: 31st July 2025**

This Privacy Policy describes how Steven Duong (referred to as "we", "us", or "our") collects, uses, and protects your personal data when you use our services. We are committed to protecting your privacy and ensuring you have a positive experience with our service.

## 1. Data We Collect

We collect various types of information from and about you, including:

- **Personal Identification Information**: Your name and email address.
- **Technical Data**: Your IP address.
- **Usage Data**: Information about how you use our website and/or application, including access times, pages viewed, and the features you interact with.
- **Exercise and Health-Related Data**: This includes exercise data you submit directly, as well as workout and health-related data collected from third-party integrations (e.g., Whoop).

## 2. How We Collect Your Data

We collect data through the following methods:

- **Directly from You**: When you register for our service, input exercise data, or communicate with us.
- **Through Third-Party Integrations**: When you connect third-party services (like Whoop) to our platform, we receive data from those services with your explicit consent.
- **Automatically via Website/Application Usage and Analytics**: We collect usage data and technical data through cookies, web beacons, and other tracking technologies.

## 3. How We Use Your Data

We use the collected data exclusively to:

- **Provide and Improve Our Service**: To deliver and personalise the content and features of our service to you.
- **Serve Customer Content**: To process and present the exercise and workout data you and integrated third parties provide.
- **Internal Analysis and Research**: To understand trends, user behaviour, and to improve the functionality and offerings of our service.
- **Communicate with You**: To send you service-related notifications, updates, and support messages.

## 4. Data Storage and Security

All data we collect is stored securely on our servers located in Australia. We implement robust security measures, including:

- **Encryption**: Your data is encrypted both in transit and at rest to protect it from unauthorised access.
- **Access Controls**: Strict access controls are in place to ensure that only authorised personnel can access your data.

## 5. Data Sharing with Third Parties

We do not share your personal identification data (name, email address) with any third parties for their marketing or commercial purposes.

However, to provide you with enhanced analysis and insights, we may utilise Artificial Intelligence (AI) Large Language Models (LLMs) provided by third-party services. When interacting with these LLMs:

- **Anonymised and De-identified Data**: We will send anonymised and de-identified exercise and health-related data to these third-party LLMs.
- **Purpose**: The sole purpose of sending this anonymised and de-identified data to LLMs is to leverage their analytical capabilities.
- **Third-Party LLM Data Retention**: Please be aware that these third-party LLM providers may store the anonymised and de-identified data.

## 6. Your Rights

You have the right to:

- **Access**: Request a copy of the personal data we hold about you.
- **Rectification**: Request correction of inaccurate or incomplete data.
- **Erasure**: Request deletion of your personal data in certain circumstances.
- **Portability**: Request transfer of your data in a structured, commonly used format.
- **Objection**: Object to processing of your personal data in certain circumstances.

## 7. Cookies and Tracking Technologies

We use cookies and similar tracking technologies to enhance your experience and analyse usage patterns.

## 8. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page.

## 9. Contact Us

If you have any questions about this Privacy Policy, please contact us at [contact information].

**Last updated: 31st July 2025**`;

export default function PrivacyPage() {
  return <LegalLayout content={privacyContent} title="Privacy Policy" />;
}
