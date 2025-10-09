import { type Metadata } from "next";
import { LegalLayout } from "~/app/_components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service - Swole Tracker",
  description: "Terms of Service for Swole Tracker",
};

const termsContent = `# Terms and Conditions of Use

Effective Date: 31st July 2025

Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the Swole Tracker application and website (the "Service") operated by Steven Duong ("us", "we", or "our").

Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who wish to access or use the Service.

By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you do not have permission to access the Service.

## 1. Accounts

When you create an account with us, you guarantee that you are above the age of 18, and that the information you provide us is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the Service.

You are responsible for maintaining the confidentiality of your account and password, including but not limited to the restriction of access to your computer and/or account. You agree to accept responsibility for any and all activities or actions that occur under your account and/or password, whether your password is with our Service or a third-party service. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.

## 2. Services Provided

Our Service provides tools and analysis for health and fitness improvement, leveraging exercise and workout data provided by you or integrated third-party services (e.g., Whoop). This includes, but is not limited to, data visualisation, performance tracking, and insights generated through data analysis, which may involve the use of Artificial Intelligence (AI) Large Language Models (LLMs).

## 3. Health and Medical Disclaimer

THE SERVICE PROVIDES HEALTH, FITNESS AND WELLNESS INFORMATION AND IS DESIGNED FOR EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY. YOU SHOULD NOT RELY ON THIS INFORMATION AS A SUBSTITUTE FOR, NOR DOES IT REPLACE, PROFESSIONAL MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT.

ALWAYS CONSULT WITH A QUALIFIED HEALTHCARE PROFESSIONAL BEFORE MAKING ANY DECISIONS ABOUT YOUR HEALTH, DIET, EXERCISE, OR LIFESTYLE. DO NOT DISREGARD, AVOID OR DELAY OBTAINING MEDICAL OR HEALTH RELATED ADVICE FROM YOUR HEALTHCARE PROFESSIONAL BECAUSE OF SOMETHING YOU MAY HAVE READ ON THE SERVICE. THE USE OF ANY INFORMATION PROVIDED ON THE SERVICE IS SOLELY AT YOUR OWN RISK.

WE ARE NOT A LICENSED MEDICAL CARE PROVIDER AND HAVE NO EXPERTISE IN DIAGNOSING, EXAMINING, OR TREATING MEDICAL CONDITIONS OF ANY KIND, OR IN DETERMINING THE EFFECT OF ANY SPECIFIC EXERCISE ON A MEDICAL CONDITION.

You acknowledge and agree that we are not responsible for any health problems that may arise from your reliance on the Service, or from any information you obtain through the Service.

## 4. Intellectual Property

The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Steven Duong and its licensors. The Service is protected by copyright, trademark, and other laws of both Australia and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Steven Duong.

## 5. User-Generated Content

You retain ownership of any data, content, or information you submit, post, or display on or through the Service, including your exercise data ("User Content"). By submitting User Content, you grant us a non-exclusive, worldwide, royalty-free, transferable, sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such User Content in connection with the operation of the Service, as described in our Privacy Policy.

## 6. Links To Other Web Sites

Our Service may contain links to third-party web sites or services that are not owned or controlled by Steven Duong.

Steven Duong has no control over, and assumes no responsibility for the content, privacy policies, or practices of any third-party web sites or services. We do not warrant the offerings of any of these entities/individuals or their websites.

## 7. Termination

We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.

## 8. Limitation of Liability

In no event shall Steven Duong, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.

## 9. Governing Law

These Terms shall be interpreted and governed by the laws of Australia, without regard to its conflict of law provisions.

## 10. Changes

We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.

**Last updated: 31st July 2025**`;

export default function TermsPage() {
  return <LegalLayout content={termsContent} title="Terms of Service" />;
}
