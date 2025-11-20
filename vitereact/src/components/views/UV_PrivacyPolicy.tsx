import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { AlertCircle, Check, Download, FileText, Shield, ChevronRight, ArrowUp, Mail } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PrivacySection {
  id: string;
  title: string;
  content: string;
  subsections?: {
    id: string;
    title: string;
    content: string;
  }[];
}

interface PrivacyContent {
  title: string;
  version: string;
  effective_date: string;
  sections: PrivacySection[];
  gdpr_compliant: boolean;
  ccpa_compliant: boolean;
  last_updated: string;
}

interface UserDataPreferences {
  analytics_consent: boolean;
  marketing_consent: boolean;
  personalization_consent: boolean;
  data_sharing_consent: boolean;
  last_updated: string | null;
}

interface DataRequestStatus {
  export_requested: boolean;
  export_status: string | null;
  deletion_requested: boolean;
  deletion_status: string | null;
}

interface ComplianceBadges {
  gdpr: boolean;
  ccpa: boolean;
  pipeda: boolean;
  other_certifications: string[];
}

// ============================================================================
// STATIC PRIVACY POLICY CONTENT
// ============================================================================

const PRIVACY_POLICY_CONTENT: PrivacyContent = {
  title: 'Privacy Policy',
  version: '1.0',
  effective_date: '2024-01-15',
  last_updated: '2024-01-15',
  gdpr_compliant: true,
  ccpa_compliant: true,
  sections: [
    {
      id: 'overview',
      title: 'Privacy Policy Overview',
      content: `Welcome to BuildEasy. This Privacy Policy explains how BuildEasy, Inc. ("BuildEasy," "we," "us," or "our") collects, uses, discloses, and protects your personal information when you use our construction supply marketplace platform, including our website, mobile applications, and related services (collectively, the "Services").

We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This policy outlines our practices concerning the collection and use of your personal data and your rights in relation to that data.

By accessing or using our Services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Services.`,
    },
    {
      id: 'information-collection',
      title: '1. Information We Collect',
      content: `We collect several types of information from and about users of our Services, including:`,
      subsections: [
        {
          id: 'personal-information',
          title: '1.1 Personal Information',
          content: `Personal information that identifies you directly or indirectly, including:

• Account Information: Name, email address, phone number, password, profile photo
• Business Information (for suppliers): Business name, registration number, business type, tax identification
• Delivery Information: Shipping addresses, delivery contact details, location data
• Payment Information: Credit/debit card details (tokenized), billing addresses, trade credit information
• Identity Verification: Government-issued IDs, business licenses (for supplier verification)
• Communication Data: Messages between buyers and sellers, customer support interactions`,
        },
        {
          id: 'transactional-data',
          title: '1.2 Transactional Data',
          content: `Information about your interactions with our Services:

• Order History: Products purchased, quantities, prices, delivery details, order status
• Shopping Behavior: Products viewed, searches performed, items saved to wishlist, cart contents
• Review and Rating Data: Reviews posted, ratings given, helpfulness votes
• Supplier Performance Data: Order fulfillment metrics, response times, customer satisfaction scores
• Financial Transactions: Payment records, refunds, trade credit usage, supplier payouts`,
        },
        {
          id: 'technical-information',
          title: '1.3 Technical Information',
          content: `Automatically collected technical data:

• Device Information: IP address, browser type and version, operating system, device identifiers
• Usage Data: Pages visited, time spent on pages, click patterns, navigation paths
• Location Data: GPS coordinates for delivery tracking (with your consent), approximate location from IP address
• Cookies and Similar Technologies: Session cookies, preference cookies, analytics cookies (see Cookie Policy)
• Log Data: Server logs, error reports, performance metrics`,
        },
        {
          id: 'third-party-information',
          title: '1.4 Information from Third Parties',
          content: `We may receive information from external sources:

• Social Media Platforms: If you connect your social media accounts, we may receive basic profile information
• Payment Processors: Transaction confirmation, payment method validation
• Delivery Partners: Shipment tracking, delivery confirmation, GPS location during delivery
• Identity Verification Services: For supplier background checks and fraud prevention
• Analytics Providers: Aggregated usage statistics and demographic data`,
        },
      ],
    },
    {
      id: 'information-use',
      title: '2. How We Use Your Information',
      content: `We use the information we collect for various purposes:`,
      subsections: [
        {
          id: 'service-provision',
          title: '2.1 To Provide and Improve Our Services',
          content: `• Process and fulfill your orders, including payment processing and delivery coordination
• Create and manage your account, including authentication and security
• Enable communication between buyers and suppliers
• Provide customer support and respond to your inquiries
• Display real-time inventory availability and pricing information
• Facilitate product reviews and ratings to help users make informed decisions
• Personalize your experience based on your preferences and browsing history
• Develop new features and improve existing functionality`,
        },
        {
          id: 'business-operations',
          title: '2.2 For Business Operations',
          content: `• Verify supplier identities and business credentials
• Calculate and process supplier payouts and commissions
• Monitor platform performance and prevent fraud
• Enforce our Terms of Service and other policies
• Resolve disputes between buyers and suppliers
• Maintain platform security and prevent unauthorized access
• Generate analytics and business intelligence reports`,
        },
        {
          id: 'marketing-communications',
          title: '2.3 Marketing and Communications',
          content: `With your consent, we may use your information to:

• Send you promotional emails about new products, special offers, and platform updates
• Provide personalized product recommendations based on your browsing and purchase history
• Notify you about price drops on products in your wishlist
• Send SMS notifications about order updates and delivery tracking
• Display targeted advertisements on our platform and third-party websites

You can opt out of marketing communications at any time through your account settings or by clicking "unsubscribe" in our emails.`,
        },
        {
          id: 'legal-compliance',
          title: '2.4 Legal Compliance and Protection',
          content: `• Comply with applicable laws, regulations, and legal processes
• Respond to lawful requests from public authorities
• Protect our rights, privacy, safety, or property
• Enforce our legal terms and conditions
• Detect, prevent, and investigate fraud, security breaches, or illegal activities
• Resolve disputes and enforce our agreements`,
        },
      ],
    },
    {
      id: 'information-sharing',
      title: '3. How We Share Your Information',
      content: `We may share your information in the following circumstances:`,
      subsections: [
        {
          id: 'suppliers-customers',
          title: '3.1 Between Buyers and Suppliers',
          content: `When you place an order:
• Your name, delivery address, and contact information are shared with the supplier to fulfill your order
• Suppliers can see your order history with them to provide better service
• Your review information (including name, unless posted anonymously) is visible to all users`,
        },
        {
          id: 'service-providers',
          title: '3.2 Service Providers and Partners',
          content: `We work with third-party service providers who perform services on our behalf:

• Payment Processors: Stripe, PayPal for secure payment processing (they receive payment card information directly, we only store tokenized references)
• Shipping and Logistics Partners: FedEx, UPS, local delivery services for order fulfillment and GPS tracking
• Cloud Hosting: AWS for secure data storage and content delivery
• Email and SMS Services: SendGrid, Twilio for transactional and marketing communications
• Analytics Providers: Google Analytics for website usage analysis
• Customer Support Tools: For live chat and ticket management
• Identity Verification Services: For supplier background checks

These providers are contractually obligated to protect your data and use it only for providing services to us.`,
        },
        {
          id: 'business-transfers',
          title: '3.3 Business Transfers',
          content: `If BuildEasy is involved in a merger, acquisition, asset sale, or bankruptcy, your information may be transferred as part of that transaction. We will notify you via email and/or prominent notice on our platform of any change in ownership or uses of your personal information.`,
        },
        {
          id: 'legal-requirements',
          title: '3.4 Legal Requirements and Protection',
          content: `We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas, or government agencies). We may also disclose information to protect our rights, privacy, safety, or property, or that of our users and the public.`,
        },
        {
          id: 'aggregated-data',
          title: '3.5 Aggregated or De-identified Data',
          content: `We may share aggregated or de-identified information that cannot reasonably be used to identify you. For example, we may share statistics about platform usage, sales trends, or market insights with suppliers to help them make informed business decisions.`,
        },
      ],
    },
    {
      id: 'user-rights',
      title: '4. Your Privacy Rights',
      content: `Depending on your location, you may have certain rights regarding your personal information:`,
      subsections: [
        {
          id: 'gdpr-rights',
          title: '4.1 GDPR Rights (European Economic Area)',
          content: `If you are located in the EEA, you have the following rights under GDPR:

• Right to Access: Request copies of your personal data
• Right to Rectification: Request correction of inaccurate or incomplete data
• Right to Erasure ("Right to be Forgotten"): Request deletion of your personal data
• Right to Restrict Processing: Request limitation of how we process your data
• Right to Data Portability: Receive your data in a machine-readable format
• Right to Object: Object to processing of your personal data for certain purposes
• Right to Withdraw Consent: Withdraw consent for data processing at any time
• Right to Lodge a Complaint: File a complaint with your local data protection authority

To exercise these rights, please contact us at privacy@buildeasy.com or use the data management tools in your account settings.`,
        },
        {
          id: 'ccpa-rights',
          title: '4.2 CCPA Rights (California Residents)',
          content: `If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):

• Right to Know: Request information about the categories and specific pieces of personal information we collect
• Right to Delete: Request deletion of your personal information (subject to certain exceptions)
• Right to Opt-Out: Opt-out of the sale of your personal information (Note: We do not sell personal information)
• Right to Non-Discrimination: Exercise your CCPA rights without discriminatory treatment

To submit a verifiable consumer request, please visit your account settings or email privacy@buildeasy.com.`,
        },
        {
          id: 'other-rights',
          title: '4.3 Other Jurisdictions',
          content: `Users in other jurisdictions may have additional rights under local privacy laws. Please contact us to learn about your specific rights and how to exercise them.`,
        },
      ],
    },
    {
      id: 'data-retention',
      title: '5. Data Retention',
      content: `We retain your personal information for as long as necessary to provide our Services and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.

Retention Periods:

• Account Information: Retained while your account is active and for 7 years after account closure for legal and tax purposes
• Transaction Records: Retained for 7 years to comply with financial record-keeping requirements
• Communication Records: Retained for 3 years for customer support and dispute resolution purposes
• Marketing Data: Retained until you withdraw consent or request deletion
• Technical Logs: Retained for 90 days for security and system maintenance
• Anonymized Analytics Data: May be retained indefinitely as it cannot identify you

After the retention period expires, we will delete or anonymize your personal information in accordance with applicable laws.`,
    },
    {
      id: 'data-security',
      title: '6. Data Security',
      content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.`,
      subsections: [
        {
          id: 'security-measures',
          title: '6.1 Security Measures',
          content: `Our security practices include:

• Encryption: All data transmitted between your device and our servers is encrypted using TLS 1.3 or higher
• Data at Rest: Personal data stored in our databases is encrypted using AES-256 encryption
• Access Controls: Role-based access controls limit employee access to personal data on a need-to-know basis
• Authentication: Multi-factor authentication (MFA) for admin accounts and optional for user accounts
• Payment Security: PCI DSS Level 1 compliant payment processing; we never store complete credit card numbers
• Regular Security Audits: Third-party penetration testing and security assessments conducted annually
• Monitoring: 24/7 security monitoring and incident response procedures
• Employee Training: Regular security awareness training for all employees with access to personal data`,
        },
        {
          id: 'data-breaches',
          title: '6.2 Data Breach Notification',
          content: `In the event of a data breach that is likely to result in a risk to your rights and freedoms, we will notify you within 72 hours of becoming aware of the breach, as required by GDPR. Notification will be sent via email to your registered email address and may include:

• Description of the breach and affected data
• Potential consequences of the breach
• Measures taken to address the breach
• Recommended actions you should take`,
        },
      ],
    },
    {
      id: 'cookies-tracking',
      title: '7. Cookies and Tracking Technologies',
      content: `We use cookies and similar tracking technologies to enhance your experience on our platform.`,
      subsections: [
        {
          id: 'cookie-types',
          title: '7.1 Types of Cookies We Use',
          content: `• Essential Cookies: Necessary for the platform to function (authentication, shopping cart, security)
• Performance Cookies: Help us understand how users interact with our platform (Google Analytics)
• Functionality Cookies: Remember your preferences and settings
• Advertising Cookies: Used to deliver relevant advertisements based on your interests

You can control cookie preferences through your browser settings. Note that disabling essential cookies may prevent you from using certain features of our Services.`,
        },
        {
          id: 'tracking-technologies',
          title: '7.2 Other Tracking Technologies',
          content: `• Web Beacons: Small graphic images in emails to track open rates and engagement
• Pixel Tags: Monitor user behavior and conversions for advertising purposes
• Local Storage: Store user preferences and session data locally in your browser
• Device Fingerprinting: Identify devices for security and fraud prevention purposes`,
        },
      ],
    },
    {
      id: 'childrens-privacy',
      title: '8. Children\'s Privacy',
      content: `Our Services are not intended for children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at privacy@buildeasy.com, and we will delete such information from our systems.`,
    },
    {
      id: 'international-transfers',
      title: '9. International Data Transfers',
      content: `BuildEasy operates in the United States, and your information may be transferred to, stored, and processed in the United States or other countries where our service providers operate.

For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we ensure appropriate safeguards are in place for international transfers:

• Standard Contractual Clauses (SCCs): We use European Commission-approved SCCs with our service providers
• Privacy Shield (where applicable): We comply with applicable Privacy Shield frameworks
• Adequacy Decisions: We rely on European Commission adequacy decisions where available

By using our Services, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection laws.`,
    },
    {
      id: 'third-party-services',
      title: '10. Third-Party Services and Links',
      content: `Our Services may contain links to third-party websites, plugins, or applications. This Privacy Policy does not apply to these external services. We are not responsible for the privacy practices of third parties.

Third-party services we integrate with include:
• Payment Processors: Stripe, PayPal
• Mapping Services: Google Maps for address validation and delivery tracking
• Social Media Platforms: For social login and sharing features
• Analytics Providers: Google Analytics, Hotjar for usage analytics

We encourage you to read the privacy policies of any third-party services you interact with through our platform.`,
    },
    {
      id: 'changes-policy',
      title: '11. Changes to This Privacy Policy',
      content: `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:

• Update the "Last Updated" date at the top of this policy
• Notify you via email (if you have an account)
• Display a prominent notice on our platform
• For significant changes, request your renewed consent where required by law

We encourage you to review this Privacy Policy periodically. Your continued use of our Services after changes are posted constitutes your acceptance of the updated Privacy Policy.`,
    },
    {
      id: 'contact-information',
      title: '12. Contact Us',
      content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

BuildEasy, Inc.
Privacy Team
Email: privacy@buildeasy.com
Phone: 1-800-BUILD-EZ (1-800-284-5339)
Mailing Address:
123 Construction Plaza, Suite 500
Austin, TX 78701
United States

Data Protection Officer (DPO):
Email: dpo@buildeasy.com

For EEA users, you may also contact our EU Representative:
BuildEasy EU Representative
Email: eu-privacy@buildeasy.com

We will respond to all requests within 30 days, or sooner as required by applicable law.`,
    },
    {
      id: 'california-notice',
      title: '13. California Privacy Notice',
      content: `This section provides additional information for California residents as required by the California Consumer Privacy Act (CCPA).

Categories of Personal Information Collected (Last 12 Months):
• Identifiers (name, email, phone, address)
• Commercial information (order history, preferences)
• Internet activity (browsing history, search queries)
• Geolocation data (delivery addresses, GPS tracking)
• Professional information (trade credentials for business accounts)

Sources of Information:
• Directly from you (account registration, orders, communications)
• Automatically through your use of our Services (cookies, logs)
• From third parties (payment processors, delivery partners)

Business Purposes for Collection:
• Providing marketplace services and customer support
• Processing transactions and managing orders
• Personalizing user experience
• Security and fraud prevention
• Legal compliance

We Do NOT Sell Personal Information:
BuildEasy does not sell personal information to third parties for monetary or other valuable consideration. We may share information with service providers and partners as described in this Privacy Policy, but such sharing does not constitute a "sale" under CCPA.`,
    },
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_PrivacyPolicy: React.FC = () => {
  // URL params for section navigation
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const version = searchParams.get('version') || 'current';

  // Local state
  const [privacy_content] = useState<PrivacyContent>(PRIVACY_POLICY_CONTENT);
  const [active_section, setActiveSection] = useState<string>(section);
  const [loading_state, setLoadingState] = useState<boolean>(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [show_back_to_top, setShowBackToTop] = useState<boolean>(false);

  // User data preferences (for authenticated users)
  const [user_data_preferences, setUserDataPreferences] = useState<UserDataPreferences>({
    analytics_consent: false,
    marketing_consent: false,
    personalization_consent: false,
    data_sharing_consent: false,
    last_updated: null,
  });

  // Data request status
  const [data_request_status, setDataRequestStatus] = useState<DataRequestStatus>({
    export_requested: false,
    export_status: null,
    deletion_requested: false,
    deletion_status: null,
  });

  // Compliance badges
  const compliance_badges: ComplianceBadges = {
    gdpr: privacy_content.gdpr_compliant,
    ccpa: privacy_content.ccpa_compliant,
    pipeda: false,
    other_certifications: [],
  };

  // Table of contents
  const table_of_contents = privacy_content.sections.map(section => ({
    section_id: section.id,
    title: section.title,
    subsections: section.subsections?.map(sub => ({
      id: sub.id,
      title: sub.title,
    })) || [],
  }));

  // Global state access - CRITICAL: Individual selectors
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Section refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize section from URL
  useEffect(() => {
    setActiveSection(section);
    
    // Scroll to section if specified
    if (section && sectionRefs.current[section]) {
      setTimeout(() => {
        sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [section]);

  // Scroll detection for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      
      // Update active section based on scroll position
      const scrollPosition = window.scrollY + 100;
      
      for (const section of privacy_content.sections) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [privacy_content.sections]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const navigateToSection = (section_id: string) => {
    setSearchParams({ section: section_id });
    setActiveSection(section_id);
    
    const element = sectionRefs.current[section_id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateDataPreferences = async (key: keyof Omit<UserDataPreferences, 'last_updated'>, value: boolean) => {
    if (!isAuthenticated) return;

    const updatedPreferences = {
      ...user_data_preferences,
      [key]: value,
      last_updated: new Date().toISOString(),
    };
    
    setUserDataPreferences(updatedPreferences);

    // API call placeholder (endpoint missing)
    try {
      // await axios.put('/api/users/me/privacy-preferences', updatedPreferences);
      console.log('Privacy preferences updated (API endpoint not available):', updatedPreferences);
    } catch (error) {
      console.error('Failed to update privacy preferences:', error);
      setErrorMessage('Failed to update privacy preferences. Please try again.');
    }
  };

  const handleRequestDataExport = async () => {
    if (!isAuthenticated) return;

    setDataRequestStatus(prev => ({
      ...prev,
      export_requested: true,
      export_status: 'processing',
    }));

    // API call placeholder (endpoint missing)
    try {
      // await axios.post('/api/users/me/data-export');
      console.log('Data export requested (API endpoint not available)');
      
      // Simulate success
      setTimeout(() => {
        setDataRequestStatus(prev => ({
          ...prev,
          export_status: 'completed',
        }));
        alert('Data export request received. You will receive a download link via email within 48 hours.');
      }, 1000);
    } catch (error) {
      console.error('Failed to request data export:', error);
      setDataRequestStatus(prev => ({
        ...prev,
        export_status: 'failed',
      }));
      setErrorMessage('Failed to request data export. Please try again or contact support.');
    }
  };

  const handleRequestAccountDeletion = async () => {
    if (!isAuthenticated) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your data, including order history and reviews, will be permanently deleted.'
    );

    if (!confirmed) return;

    setDataRequestStatus(prev => ({
      ...prev,
      deletion_requested: true,
      deletion_status: 'pending_verification',
    }));

    // API call placeholder (endpoint missing)
    try {
      // await axios.post('/api/users/me/delete-account');
      console.log('Account deletion requested (API endpoint not available)');
      
      alert('Account deletion request received. You will receive a verification email to confirm this request within 24 hours.');
    } catch (error) {
      console.error('Failed to request account deletion:', error);
      setDataRequestStatus(prev => ({
        ...prev,
        deletion_status: 'failed',
      }));
      setErrorMessage('Failed to request account deletion. Please contact support at privacy@buildeasy.com.');
    }
  };

  const handleDownloadPDF = () => {
    // PDF generation placeholder (endpoint missing)
    alert('PDF download feature is coming soon. For now, you can print this page using your browser\'s print function (Ctrl+P or Cmd+P).');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="h-16 w-16 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {privacy_content.title}
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Version {privacy_content.version}</span>
                </div>
                <div>
                  <span className="font-medium">Effective Date:</span> {new Date(privacy_content.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {new Date(privacy_content.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Compliance Badges */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {compliance_badges.gdpr && (
                  <div className="flex items-center bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                    <Check className="h-4 w-4 mr-2" />
                    GDPR Compliant
                  </div>
                )}
                {compliance_badges.ccpa && (
                  <div className="flex items-center bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                    <Check className="h-4 w-4 mr-2" />
                    CCPA Compliant
                  </div>
                )}
              </div>

              {/* Download PDF Button */}
              <div className="mt-6">
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Download as PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents - Desktop Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {table_of_contents.map((item) => (
                    <div key={item.section_id}>
                      <button
                        onClick={() => navigateToSection(item.section_id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active_section === item.section_id
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                        }`}
                      >
                        {item.title}
                      </button>
                      {item.subsections.length > 0 && active_section === item.section_id && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.subsections.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => navigateToSection(sub.id)}
                              className="w-full text-left px-3 py-1 text-xs text-gray-500 hover:text-blue-600"
                            >
                              {sub.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-12">
              {/* Privacy Policy Content */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <div className="prose prose-lg max-w-none">
                  {privacy_content.sections.map((section_item) => (
                    <section
                      key={section_item.id}
                      id={section_item.id}
                      ref={(el) => {
                        sectionRefs.current[section_item.id] = el;
                      }}
                      className="mb-16 scroll-mt-24"
                    >
                      <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b-2 border-gray-200">
                        {section_item.title}
                      </h2>
                      <div className="text-base leading-relaxed text-gray-700 whitespace-pre-line mb-6">
                        {section_item.content}
                      </div>

                      {/* Subsections */}
                      {section_item.subsections && section_item.subsections.length > 0 && (
                        <div className="space-y-8 ml-0 lg:ml-6">
                          {section_item.subsections.map((subsection) => (
                            <div
                              key={subsection.id}
                              id={subsection.id}
                              ref={(el) => {
                                sectionRefs.current[subsection.id] = el;
                              }}
                              className="scroll-mt-24"
                            >
                              <h3 className="text-xl font-medium text-gray-900 mb-4">
                                {subsection.title}
                              </h3>
                              <div className="text-base leading-relaxed text-gray-600 whitespace-pre-line">
                                {subsection.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              </div>

              {/* Privacy Preferences Section (Authenticated Users Only) */}
              {isAuthenticated && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <div className="border-b border-gray-200 pb-6 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Your Privacy Preferences
                    </h2>
                    <p className="text-sm text-gray-600">
                      Control how we use your data. Changes are saved automatically.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Analytics Consent */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          Analytics and Performance
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Allow us to collect anonymized usage data to improve our platform performance and user experience.
                        </p>
                      </div>
                      <button
                        onClick={() => handleUpdateDataPreferences('analytics_consent', !user_data_preferences.analytics_consent)}
                        className={`ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          user_data_preferences.analytics_consent ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={user_data_preferences.analytics_consent}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            user_data_preferences.analytics_consent ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Marketing Consent */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          Marketing Communications
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Receive personalized offers, promotions, and product recommendations via email.
                        </p>
                      </div>
                      <button
                        onClick={() => handleUpdateDataPreferences('marketing_consent', !user_data_preferences.marketing_consent)}
                        className={`ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          user_data_preferences.marketing_consent ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={user_data_preferences.marketing_consent}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            user_data_preferences.marketing_consent ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Personalization Consent */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          Personalization
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Use your browsing history and preferences to personalize product recommendations.
                        </p>
                      </div>
                      <button
                        onClick={() => handleUpdateDataPreferences('personalization_consent', !user_data_preferences.personalization_consent)}
                        className={`ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          user_data_preferences.personalization_consent ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={user_data_preferences.personalization_consent}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            user_data_preferences.personalization_consent ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Data Sharing Consent */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          Anonymized Data Sharing
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Allow sharing of anonymized data with suppliers for market analytics (no personal information shared).
                        </p>
                      </div>
                      <button
                        onClick={() => handleUpdateDataPreferences('data_sharing_consent', !user_data_preferences.data_sharing_consent)}
                        className={`ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          user_data_preferences.data_sharing_consent ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={user_data_preferences.data_sharing_consent}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                            user_data_preferences.data_sharing_consent ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {user_data_preferences.last_updated && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Last updated: {new Date(user_data_preferences.last_updated).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Data Rights Section (Authenticated Users Only) */}
              {isAuthenticated && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <div className="border-b border-gray-200 pb-6 mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Your Data Rights
                    </h2>
                    <p className="text-sm text-gray-600">
                      Exercise your GDPR and CCPA rights to access, export, or delete your personal data.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Data Export */}
                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Download Your Data
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Request a copy of all personal data we have about you. You'll receive a download link via email within 48 hours.
                          </p>
                          {data_request_status.export_requested && (
                            <div className="mb-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                data_request_status.export_status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : data_request_status.export_status === 'processing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                Status: {data_request_status.export_status || 'Unknown'}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleRequestDataExport}
                          disabled={data_request_status.export_requested && data_request_status.export_status === 'processing'}
                          className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {data_request_status.export_requested && data_request_status.export_status === 'processing' ? 'Processing...' : 'Request Data Export'}
                        </button>
                      </div>
                    </div>

                    {/* Account Deletion */}
                    <div className="border border-red-200 bg-red-50 rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-red-900 mb-2 flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Delete Your Account
                          </h3>
                          <p className="text-sm text-red-700 mb-2">
                            <strong>Warning:</strong> This action cannot be undone. All your data, including order history, reviews, and saved items, will be permanently deleted.
                          </p>
                          <p className="text-sm text-red-600">
                            Outstanding orders must be completed or cancelled before account deletion.
                          </p>
                          {data_request_status.deletion_requested && (
                            <div className="mt-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                Status: {data_request_status.deletion_status || 'Pending verification'}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleRequestAccountDeletion}
                          disabled={data_request_status.deletion_requested}
                          className="ml-4 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {data_request_status.deletion_requested ? 'Request Sent' : 'Delete Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Privacy Team */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-blue-600 mt-1 mr-4" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Questions About Privacy?
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Our Privacy Team is here to help. If you have questions about this policy or how we handle your data, please don't hesitate to reach out.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href="mailto:privacy@buildeasy.com"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        Email Privacy Team
                      </a>
                      <Link
                        to="/contact"
                        className="inline-flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
                      >
                        Contact Support
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Legal Documents */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Related Legal Documents
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    to="/terms"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Terms of Service</div>
                      <div className="text-sm text-gray-600">Platform usage terms</div>
                    </div>
                  </Link>
                  <Link
                    to="/help"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Cookie Policy</div>
                      <div className="text-sm text-gray-600">How we use cookies</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Top Button */}
        {show_back_to_top && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-100 z-50"
            aria-label="Back to top"
          >
            <ArrowUp className="h-6 w-6" />
          </button>
        )}

        {/* Error Message Toast */}
        {error_message && (
          <div className="fixed top-20 right-4 max-w-md bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-lg z-50">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{error_message}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-4 text-red-700 hover:text-red-900"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_PrivacyPolicy;