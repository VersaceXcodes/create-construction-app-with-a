import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TermsSubsection {
  id: string;
  title: string;
  content: string;
}

interface TermsSection {
  id: string;
  title: string;
  content: string;
  subsections: TermsSubsection[];
}

interface TermsContent {
  title: string;
  version: string;
  effective_date: string;
  sections: TermsSection[];
  last_updated: string;
}

interface TableOfContentsItem {
  section_id: string;
  title: string;
  subsections: { id: string; title: string }[];
}

interface UserAcceptanceStatus {
  accepted: boolean;
  acceptance_date: string | null;
  version_accepted: string | null;
}

// ============================================================================
// HARDCODED TERMS CONTENT
// ============================================================================

const TERMS_CONTENT: TermsContent = {
  title: 'Terms of Service',
  version: '1.0',
  effective_date: '2024-01-01',
  last_updated: '2024-01-01T00:00:00Z',
  sections: [
    {
      id: 'introduction',
      title: '1. Introduction and Acceptance',
      content: `
        <p>Welcome to BuildEasy ("Platform", "Service", "we", "us", or "our"). BuildEasy is a construction supply marketplace platform that connects buyers (customers) with construction material suppliers across the United States.</p>
        
        <p>These Terms of Service ("Terms", "Agreement") constitute a legally binding agreement between you ("User", "you", or "your") and BuildEasy. By accessing or using our Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
        
        <h3>Acceptance of Terms</h3>
        <p>By creating an account, browsing products, making purchases, or using any services on the BuildEasy Platform, you expressly agree to these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Platform.</p>
        
        <h3>Modifications to Terms</h3>
        <p>We reserve the right to modify these Terms at any time. We will notify users of material changes via email and in-app notifications at least 30 days before the changes take effect. Your continued use of the Platform after changes become effective constitutes acceptance of the modified Terms.</p>
      `,
      subsections: []
    },
    {
      id: 'definitions',
      title: '2. Definitions',
      content: `
        <p>For the purposes of these Terms, the following definitions apply:</p>
        
        <ul>
          <li><strong>Buyer/Customer:</strong> An individual or business entity purchasing construction materials through the Platform.</li>
          <li><strong>Supplier:</strong> A verified business selling construction materials through the Platform.</li>
          <li><strong>Product:</strong> Construction materials, supplies, or equipment listed for sale on the Platform.</li>
          <li><strong>Order:</strong> A confirmed purchase transaction between a Customer and one or more Suppliers.</li>
          <li><strong>Trade Credit:</strong> A line of credit extended to qualified business customers for purchases on the Platform.</li>
          <li><strong>Surplus Marketplace:</strong> The peer-to-peer section of the Platform where users can buy and sell unused construction materials.</li>
          <li><strong>Delivery Window:</strong> The scheduled time range for delivery of purchased products.</li>
          <li><strong>GMV (Gross Merchandise Value):</strong> The total sales value of merchandise sold through the Platform.</li>
        </ul>
      `,
      subsections: []
    },
    {
      id: 'eligibility',
      title: '3. Eligibility and Account Registration',
      content: `
        <h3>3.1 Age and Capacity</h3>
        <p>You must be at least 18 years old and have the legal capacity to enter into contracts to use this Platform. By registering, you represent and warrant that you meet these requirements.</p>
        
        <h3>3.2 Account Types</h3>
        <p>BuildEasy offers two primary account types:</p>
        <ul>
          <li><strong>Customer Accounts:</strong> For individuals or businesses purchasing construction materials. Customer accounts may be classified as Retail (DIY/personal use) or Trade (professional contractors/businesses).</li>
          <li><strong>Supplier Accounts:</strong> For verified businesses selling construction materials. Supplier accounts require application, verification, and approval by BuildEasy administrators.</li>
        </ul>
        
        <h3>3.3 Account Registration</h3>
        <p>When creating an account, you agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information</li>
          <li>Maintain and promptly update your account information</li>
          <li>Maintain the security of your password and account credentials</li>
          <li>Accept responsibility for all activities that occur under your account</li>
          <li>Immediately notify BuildEasy of any unauthorized use of your account</li>
        </ul>
        
        <h3>3.4 Email Verification</h3>
        <p>All users must verify their email address within 7 days of registration. Unverified accounts may have limited access to Platform features.</p>
        
        <h3>3.5 Account Suspension and Termination</h3>
        <p>BuildEasy reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose a risk to the Platform or other users.</p>
      `,
      subsections: []
    },
    {
      id: 'customer-obligations',
      title: '4. Customer Obligations and Conduct',
      content: `
        <h3>4.1 Purchasing Rules</h3>
        <p>As a Customer, you agree to:</p>
        <ul>
          <li>Provide accurate delivery addresses and contact information</li>
          <li>Be available during scheduled delivery windows or provide appropriate receiving arrangements</li>
          <li>Inspect delivered products promptly and report issues within 48 hours of delivery</li>
          <li>Pay for all orders placed using your account</li>
          <li>Not resell products purchased for personal use as commercial transactions</li>
        </ul>
        
        <h3>4.2 Trade Credit Terms</h3>
        <p>If approved for trade credit:</p>
        <ul>
          <li>You agree to the payment terms specified in your credit agreement (typically Net 30 days)</li>
          <li>Late payments may incur fees and interest as specified in your credit terms</li>
          <li>Failure to pay may result in credit suspension, account suspension, or legal action</li>
          <li>BuildEasy reserves the right to modify or revoke trade credit at any time</li>
        </ul>
        
        <h3>4.3 Prohibited Activities</h3>
        <p>Customers must not:</p>
        <ul>
          <li>Use the Platform for any illegal purposes</li>
          <li>Submit false or fraudulent orders</li>
          <li>Abuse return or refund policies</li>
          <li>Harass or abuse Suppliers or Platform staff</li>
          <li>Attempt to manipulate reviews or ratings</li>
          <li>Share account credentials with others</li>
          <li>Use automated bots or scrapers to access the Platform</li>
        </ul>
      `,
      subsections: []
    },
    {
      id: 'supplier-obligations',
      title: '5. Supplier Obligations and Conduct',
      content: `
        <h3>5.1 Supplier Verification</h3>
        <p>All Suppliers must complete our verification process, which includes:</p>
        <ul>
          <li>Business registration verification</li>
          <li>Tax ID verification</li>
          <li>Identity verification of business owners</li>
          <li>Address and location verification</li>
          <li>Background and compliance checks</li>
        </ul>
        
        <h3>5.2 Product Listing Requirements</h3>
        <p>Suppliers must:</p>
        <ul>
          <li>Provide accurate product descriptions, specifications, and pricing</li>
          <li>Include clear, high-quality product images</li>
          <li>Maintain real-time inventory accuracy (stock quantities must reflect actual availability)</li>
          <li>Update product information promptly when changes occur</li>
          <li>Only list products they are legally authorized to sell</li>
          <li>Clearly state product conditions, warranties, and return policies</li>
        </ul>
        
        <h3>5.3 Order Fulfillment Obligations</h3>
        <p>Suppliers agree to:</p>
        <ul>
          <li>Accept or decline orders within 24 hours of placement</li>
          <li>Fulfill accepted orders within the committed timeframe</li>
          <li>Deliver products within scheduled delivery windows</li>
          <li>Provide accurate tracking information when available</li>
          <li>Maintain a minimum 95% fulfillment rate</li>
          <li>Communicate proactively about delays or issues</li>
        </ul>
        
        <h3>5.4 Customer Service Requirements</h3>
        <p>Suppliers must:</p>
        <ul>
          <li>Respond to customer inquiries within 24 hours</li>
          <li>Handle returns and refunds according to stated policies and Platform standards</li>
          <li>Resolve customer issues professionally and promptly</li>
          <li>Maintain a minimum 4.0-star average rating</li>
        </ul>
        
        <h3>5.5 Prohibited Supplier Activities</h3>
        <p>Suppliers must not:</p>
        <ul>
          <li>List counterfeit, stolen, or illegal products</li>
          <li>Manipulate inventory levels to create false scarcity</li>
          <li>Engage in price manipulation or collusion with other suppliers</li>
          <li>Solicit customers to complete transactions outside the Platform</li>
          <li>Post fake reviews or incentivize positive reviews improperly</li>
          <li>Discriminate against customers based on protected characteristics</li>
        </ul>
        
        <h3>5.6 Commission and Payment Terms</h3>
        <p>Suppliers agree to pay BuildEasy a commission on all sales completed through the Platform. Commission rates are specified in individual supplier agreements and typically range from 5-12% depending on subscription tier. Payouts are processed according to the agreed payout frequency (weekly, bi-weekly, or monthly).</p>
      `,
      subsections: []
    },
    {
      id: 'transactions',
      title: '6. Transactions and Payments',
      content: `
        <h3>6.1 Payment Processing</h3>
        <p>All payments are processed securely through our integrated payment partners (Stripe and PayPal). BuildEasy does not directly store credit card information. By making a purchase, you authorize BuildEasy to charge your selected payment method for the total order amount, including products, delivery fees, and applicable taxes.</p>
        
        <h3>6.2 Pricing and Availability</h3>
        <p>Product prices are set by individual Suppliers and displayed in US Dollars (USD). Prices are subject to change without notice. BuildEasy makes reasonable efforts to ensure price accuracy, but errors may occur. If a product is listed at an incorrect price due to system error, BuildEasy or the Supplier reserves the right to cancel the order and refund the payment.</p>
        
        <h3>6.3 Taxes</h3>
        <p>Customers are responsible for all applicable taxes based on their delivery location. Tax amounts are calculated and displayed at checkout before order confirmation.</p>
        
        <h3>6.4 Order Confirmation</h3>
        <p>Orders are not final until you receive an order confirmation email. Order confirmations are sent to the email address associated with your account. You are responsible for ensuring your email address is current and accurate.</p>
        
        <h3>6.5 Payment Security</h3>
        <p>BuildEasy is PCI DSS Level 1 compliant. All payment transactions are encrypted and transmitted securely. We implement industry-standard security measures to protect your financial information.</p>
      `,
      subsections: []
    },
    {
      id: 'delivery',
      title: '7. Delivery and Fulfillment',
      content: `
        <h3>7.1 Delivery Windows</h3>
        <p>Delivery windows are scheduled during checkout and confirmed by Suppliers. Customers must select an available delivery window for each Supplier in multi-supplier orders. Delivery windows are estimates and may be subject to change due to weather, traffic, or unforeseen circumstances.</p>
        
        <h3>7.2 Delivery Fees</h3>
        <p>Delivery fees are calculated based on delivery distance, order size, and selected delivery method. Fees are displayed at checkout before order confirmation. Some Suppliers may offer free delivery for orders exceeding a minimum purchase amount.</p>
        
        <h3>7.3 Failed Deliveries</h3>
        <p>If delivery fails due to Customer unavailability, incorrect address, or refusal of delivery, the Customer may be charged redelivery fees. After two failed delivery attempts, the order may be cancelled, and restocking fees may apply.</p>
        
        <h3>7.4 Inspection and Acceptance</h3>
        <p>Customers must inspect delivered products upon receipt. Issues must be reported within 48 hours of delivery. Acceptance of delivery (signature or photographic proof) indicates apparent satisfactory condition subject to reasonable inspection period.</p>
      `,
      subsections: []
    },
    {
      id: 'returns-refunds',
      title: '8. Returns, Refunds, and Cancellations',
      content: `
        <h3>8.1 Cancellation Policy</h3>
        <p>Customers may cancel orders before they enter "preparing" status. Once a Supplier begins preparing an order, cancellation may not be possible, or restocking fees may apply. Cancellations are processed through the Platform, and refunds are issued to the original payment method within 5-7 business days.</p>
        
        <h3>8.2 Return Policy</h3>
        <p>Return policies vary by Supplier and product type. Standard return policy allows returns within 30 days of delivery for undamaged, unopened products in original packaging. Special-order or custom products may not be returnable. Customers are responsible for return shipping costs unless the product is defective or incorrect.</p>
        
        <h3>8.3 Refund Processing</h3>
        <p>Approved refunds are processed within 5-7 business days of return receipt and inspection. Refunds are issued to the original payment method. Trade credit refunds are credited back to the customer's credit balance.</p>
        
        <h3>8.4 Damaged or Defective Products</h3>
        <p>If products arrive damaged or defective, Customers must report the issue within 48 hours of delivery with photographic evidence. BuildEasy or the Supplier will provide a replacement or full refund at no additional cost to the Customer, including return shipping.</p>
      `,
      subsections: []
    },
    {
      id: 'intellectual-property',
      title: '9. Intellectual Property Rights',
      content: `
        <h3>9.1 Platform Ownership</h3>
        <p>The BuildEasy Platform, including its design, code, features, content, and trademarks, is owned by BuildEasy and protected by United States and international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works from the Platform without express written permission.</p>
        
        <h3>9.2 User-Generated Content</h3>
        <p>By submitting content to the Platform (reviews, photos, messages, surplus listings), you grant BuildEasy a worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, distribute, modify, and display such content in connection with operating and promoting the Platform.</p>
        
        <h3>9.3 Product Images and Descriptions</h3>
        <p>Suppliers represent that they have the right to use all product images and descriptions they upload. Suppliers are responsible for ensuring they do not infringe on third-party intellectual property rights.</p>
        
        <h3>9.4 Trademark Usage</h3>
        <p>The "BuildEasy" name, logo, and related marks are trademarks of BuildEasy. You may not use our trademarks without prior written consent, except as necessary to identify BuildEasy as the platform facilitating your transaction.</p>
      `,
      subsections: []
    },
    {
      id: 'privacy',
      title: '10. Privacy and Data Protection',
      content: `
        <p>Your privacy is important to us. Our collection, use, and protection of personal information is governed by our Privacy Policy, which is incorporated by reference into these Terms. By using the Platform, you consent to the practices described in the Privacy Policy.</p>
        
        <h3>Key Privacy Commitments:</h3>
        <ul>
          <li>We collect only information necessary to provide our services</li>
          <li>We use industry-standard encryption to protect your data</li>
          <li>We do not sell your personal information to third parties</li>
          <li>You may request access to or deletion of your personal data (subject to legal obligations)</li>
          <li>We comply with applicable data protection regulations including GDPR and CCPA</li>
        </ul>
        
        <p>For complete details on our data practices, please review our <a href="/privacy" class="text-blue-600 hover:text-blue-700 underline">Privacy Policy</a>.</p>
      `,
      subsections: []
    },
    {
      id: 'reviews',
      title: '11. Reviews, Ratings, and User Content',
      content: `
        <h3>11.1 Review Eligibility</h3>
        <p>Only verified purchasers may leave reviews for products and Suppliers. Reviews must be based on genuine personal experience with the product or service.</p>
        
        <h3>11.2 Review Guidelines</h3>
        <p>Reviews must:</p>
        <ul>
          <li>Be honest and based on actual experience</li>
          <li>Relate to the product or service being reviewed</li>
          <li>Not contain profanity, hate speech, or personal attacks</li>
          <li>Not include promotional content or competitor references</li>
          <li>Not violate any laws or third-party rights</li>
        </ul>
        
        <h3>11.3 Content Moderation</h3>
        <p>BuildEasy reserves the right to remove reviews or content that violates these guidelines. Repeated violations may result in account suspension. We do not pre-approve reviews but may moderate flagged content.</p>
        
        <h3>11.4 Supplier Responses</h3>
        <p>Suppliers may respond to reviews publicly. Responses must be professional and constructive. Suppliers may not offer incentives to customers in exchange for removing or modifying negative reviews.</p>
      `,
      subsections: []
    },
    {
      id: 'liability',
      title: '12. Limitation of Liability',
      content: `
        <h3>12.1 Platform as Marketplace</h3>
        <p>BuildEasy acts as a marketplace connecting Buyers and Suppliers. We are not a construction supplier, manufacturer, or distributor. We do not take title to products listed on the Platform. Transactions are directly between Customers and Suppliers.</p>
        
        <h3>12.2 Product Quality and Safety</h3>
        <p>Suppliers are solely responsible for the quality, safety, and legality of products they list and sell. BuildEasy does not inspect, test, or verify products (except through standard moderation processes). BuildEasy is not liable for defective, dangerous, or non-compliant products.</p>
        
        <h3>12.3 Disclaimer of Warranties</h3>
        <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
        
        <h3>12.4 Limitation of Damages</h3>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUILDEASY'S TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER OF (A) $500 OR (B) THE AMOUNT YOU PAID TO BUILDEASY IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
        
        <h3>12.5 Indemnification</h3>
        <p>You agree to indemnify, defend, and hold harmless BuildEasy, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:</p>
        <ul>
          <li>Your use of the Platform</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any law or third-party rights</li>
          <li>Content you submit to the Platform</li>
          <li>Products you list (if Supplier) or disputes related to your orders (if Customer)</li>
        </ul>
      `,
      subsections: []
    },
    {
      id: 'disputes',
      title: '13. Dispute Resolution and Legal',
      content: `
        <h3>13.1 Platform Dispute Resolution</h3>
        <p>For issues between Customers and Suppliers, we encourage resolution through the Platform's issue reporting and dispute resolution system. BuildEasy administrators may mediate disputes when escalated.</p>
        
        <h3>13.2 Governing Law</h3>
        <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.</p>
        
        <h3>13.3 Arbitration Agreement</h3>
        <p>Any dispute arising from these Terms or your use of the Platform shall be resolved through binding arbitration in accordance with the American Arbitration Association's Commercial Arbitration Rules. You waive your right to participate in class action lawsuits or class-wide arbitration.</p>
        
        <h3>13.4 Exceptions to Arbitration</h3>
        <p>Either party may seek injunctive relief in court for intellectual property infringement or unauthorized access to the Platform. Small claims court actions are also exempt from mandatory arbitration.</p>
        
        <h3>13.5 Venue</h3>
        <p>To the extent court proceedings are permitted under these Terms, the exclusive venue shall be state or federal courts located in Delaware.</p>
      `,
      subsections: []
    },
    {
      id: 'surplus-marketplace',
      title: '14. Surplus Marketplace Terms',
      content: `
        <h3>14.1 Surplus Marketplace Overview</h3>
        <p>The Surplus Marketplace allows registered users to list unused construction materials for peer-to-peer sale. These transactions are subject to additional terms beyond standard product purchases.</p>
        
        <h3>14.2 Listing Requirements</h3>
        <p>Surplus listings must:</p>
        <ul>
          <li>Accurately describe the item's condition</li>
          <li>Include clear photographs showing actual condition</li>
          <li>Specify pickup location or shipping availability</li>
          <li>Comply with all applicable laws regarding sale of goods</li>
          <li>Not include prohibited items (hazardous materials, stolen goods, etc.)</li>
        </ul>
        
        <h3>14.3 Payment Escrow</h3>
        <p>Payments for surplus items are held in escrow by BuildEasy until:</p>
        <ul>
          <li>Buyer confirms receipt and satisfactory condition (for pickup), OR</li>
          <li>Delivery confirmation is received (for shipped items), OR</li>
          <li>14 days have passed without dispute</li>
        </ul>
        
        <h3>14.4 Surplus Transaction Disputes</h3>
        <p>In case of disputes regarding surplus items, BuildEasy may refund the buyer and withhold payment from the seller. Repeated disputes may result in suspension from the Surplus Marketplace.</p>
      `,
      subsections: []
    },
    {
      id: 'termination',
      title: '15. Termination and Account Closure',
      content: `
        <h3>15.1 Voluntary Termination</h3>
        <p>You may terminate your account at any time through account settings. Upon termination:</p>
        <ul>
          <li>You must complete or cancel all pending orders</li>
          <li>Outstanding balances (trade credit, surplus escrow) must be settled</li>
          <li>Your personal data will be handled according to our Privacy Policy</li>
          <li>Order history will be retained for legal and accounting purposes</li>
        </ul>
        
        <h3>15.2 Termination by BuildEasy</h3>
        <p>BuildEasy may terminate or suspend your account immediately for:</p>
        <ul>
          <li>Violation of these Terms</li>
          <li>Fraudulent activity</li>
          <li>Non-payment (for trade credit accounts)</li>
          <li>Violation of laws or regulations</li>
          <li>Damage to Platform reputation or other users</li>
        </ul>
        
        <h3>15.3 Effect of Termination</h3>
        <p>Upon termination, your right to access and use the Platform immediately ceases. Provisions of these Terms that by their nature should survive termination shall survive, including intellectual property rights, liability limitations, and dispute resolution provisions.</p>
      `,
      subsections: []
    },
    {
      id: 'miscellaneous',
      title: '16. Miscellaneous Provisions',
      content: `
        <h3>16.1 Entire Agreement</h3>
        <p>These Terms, together with our Privacy Policy and any additional agreements entered into with BuildEasy, constitute the entire agreement between you and BuildEasy regarding use of the Platform.</p>
        
        <h3>16.2 Severability</h3>
        <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
        
        <h3>16.3 Waiver</h3>
        <p>No waiver of any provision of these Terms shall be deemed a further or continuing waiver of such provision or any other provision.</p>
        
        <h3>16.4 Assignment</h3>
        <p>You may not assign or transfer these Terms or your account without BuildEasy's prior written consent. BuildEasy may assign these Terms without restriction.</p>
        
        <h3>16.5 Force Majeure</h3>
        <p>BuildEasy is not liable for failure to perform obligations due to circumstances beyond reasonable control, including natural disasters, acts of government, war, terrorism, internet failures, or other force majeure events.</p>
        
        <h3>16.6 Contact Information</h3>
        <p>For questions about these Terms or the Platform, contact us at:</p>
        <ul>
          <li>Email: legal@buildeasy.com</li>
          <li>Phone: 1-800-BUILD-EZ</li>
          <li>Mail: BuildEasy, Inc., Legal Department, [Address]</li>
        </ul>
      `,
      subsections: []
    }
  ]
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_TermsOfService: React.FC = () => {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Global state - CRITICAL: Individual selectors
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [terms_content] = useState<TermsContent>(TERMS_CONTENT);
  const [active_section, setActiveSection] = useState<string>(searchParams.get('section') || 'introduction');
  // const _current_version = searchParams.get('version') || 'current'; // For future version support
  const [table_of_contents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [user_acceptance_status, setUserAcceptanceStatus] = useState<UserAcceptanceStatus>({
    accepted: false,
    acceptance_date: null,
    version_accepted: null
  });
  const [loading_state] = useState<boolean>(false);
  const [error_message] = useState<string | null>(null);
  const [showAcceptSuccess, setShowAcceptSuccess] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Refs
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    // Generate table of contents from terms content
    const toc: TableOfContentsItem[] = terms_content.sections.map(section => ({
      section_id: section.id,
      title: section.title,
      subsections: section.subsections.map(sub => ({
        id: sub.id,
        title: sub.title
      }))
    }));
    setTableOfContents(toc);
    
    // Check if authenticated user has accepted terms
    // In production, this would be an API call: GET /api/v1/users/me/terms-acceptance
    if (isAuthenticated && currentUser) {
      // Mock: Check localStorage for acceptance (can be replaced with API call)
      const storedAcceptance = localStorage.getItem(`terms_acceptance_${currentUser.user_id}`);
      if (storedAcceptance) {
        const acceptance = JSON.parse(storedAcceptance);
        setUserAcceptanceStatus(acceptance);
      }
    }
  }, [terms_content, isAuthenticated, currentUser]);
  
  // Sync active section with URL param
  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (sectionParam && sectionParam !== active_section) {
      setActiveSection(sectionParam);
    }
  }, [searchParams]);
  
  // Scroll to active section on mount or section change
  useEffect(() => {
    if (active_section && sectionRefs.current[active_section]) {
      setTimeout(() => {
        sectionRefs.current[active_section]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [active_section]);
  
  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================
  
  const navigateToSection = (section_id: string) => {
    setActiveSection(section_id);
    setSearchParams({ section: section_id });
    setIsMobileMenuOpen(false);
    
    // Scroll to section
    if (sectionRefs.current[section_id]) {
      sectionRefs.current[section_id]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };
  
  const acceptTerms = () => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login?redirect_url=/terms');
      return;
    }
    
    // In production: POST /api/v1/users/me/accept-terms
    // For now: Store in localStorage
    const acceptance: UserAcceptanceStatus = {
      accepted: true,
      acceptance_date: new Date().toISOString(),
      version_accepted: terms_content.version
    };
    
    localStorage.setItem(`terms_acceptance_${currentUser.user_id}`, JSON.stringify(acceptance));
    setUserAcceptanceStatus(acceptance);
    setShowAcceptSuccess(true);
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowAcceptSuccess(false);
    }, 5000);
  };
  
  const downloadTermsPDF = () => {
    // In production: GET /api/v1/legal/terms/pdf
    // For now: Show not implemented message
    alert('PDF download will be available soon. This feature requires backend implementation.');
  };
  
  const trackContentView = (section_id: string) => {
    // In production: POST /api/v1/analytics/content-engagement
    // For now: Console log
    console.log(`Section viewed: ${section_id} at ${new Date().toISOString()}`);
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Page Container */}
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <h1 className="text-3xl font-bold text-gray-900">{terms_content.title}</h1>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Version {terms_content.version}</span>
                  <span>•</span>
                  <span>Effective Date: {new Date(terms_content.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>•</span>
                  <span>Last Updated: {new Date(terms_content.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Download PDF Button */}
                <button
                  onClick={downloadTermsPDF}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                </button>
                
                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Acceptance Status Banner (if authenticated) */}
            {isAuthenticated && user_acceptance_status.accepted && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">
                    You accepted these terms on {new Date(user_acceptance_status.acceptance_date!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {user_acceptance_status.version_accepted && ` (Version ${user_acceptance_status.version_accepted})`}
                  </p>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            {showAcceptSuccess && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">
                    Thank you for accepting our Terms of Service!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Table of Contents - Desktop Sidebar */}
            <aside className={`lg:w-80 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="sticky top-24 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Table of Contents</h2>
                
                <nav className="space-y-1">
                  {table_of_contents.map((item) => (
                    <div key={item.section_id}>
                      <button
                        onClick={() => navigateToSection(item.section_id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          active_section === item.section_id
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        {item.title}
                      </button>
                      
                      {/* Subsections (if any) */}
                      {item.subsections.length > 0 && active_section === item.section_id && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.subsections.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => navigateToSection(sub.id)}
                              className="w-full text-left px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                            >
                              {sub.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
                
                {/* Quick Links */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Documents</h3>
                  <div className="space-y-2">
                    <Link
                      to="/privacy"
                      className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Privacy Policy →
                    </Link>
                    <Link
                      to="/help"
                      className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Help Center →
                    </Link>
                    <Link
                      to="/contact"
                      className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Contact Us →
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
            
            {/* Main Content Area */}
            <main className="flex-1 bg-white rounded-lg shadow-lg border border-gray-200 p-8 lg:p-12">
              {/* Error State */}
              {error_message && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-800">{error_message}</p>
                  </div>
                </div>
              )}
              
              {/* Loading State */}
              {loading_state && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                </div>
              )}
              
              {/* Terms Content */}
              {!loading_state && !error_message && (
                <div className="prose prose-lg prose-blue max-w-none">
                  {/* Sections */}
                  {terms_content.sections.map((section) => (
                    <section
                      key={section.id}
                      id={section.id}
                      ref={(el) => {
                        sectionRefs.current[section.id] = el;
                      }}
                      className={`mb-12 scroll-mt-24 ${
                        active_section === section.id ? 'ring-2 ring-blue-200 ring-offset-4 rounded-lg p-4 -m-4' : ''
                      }`}
                      onMouseEnter={() => trackContentView(section.id)}
                    >
                      {/* Section Title */}
                      <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                        {section.title}
                      </h2>
                      
                      {/* Section Content */}
                      <div 
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                      
                      {/* Subsections */}
                      {section.subsections.map(subsection => (
                        <div
                          key={subsection.id}
                          id={subsection.id}
                          ref={(el) => {
                            sectionRefs.current[subsection.id] = el;
                          }}
                          className="mt-6"
                        >
                          <h3 className="text-xl font-semibold text-gray-800 mb-3">
                            {subsection.title}
                          </h3>
                          <div 
                            className="text-gray-700"
                            dangerouslySetInnerHTML={{ __html: subsection.content }}
                          />
                        </div>
                      ))}
                    </section>
                  ))}
                  
                  {/* Acknowledgment Section */}
                  <section className="mt-12 pt-8 border-t-2 border-gray-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Acknowledgment
                    </h2>
                    <p className="text-gray-700 mb-6">
                      BY CLICKING "I ACCEPT" BELOW OR BY CONTINUING TO USE THE BUILDEASY PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
                    </p>
                    
                    {/* Acceptance Button (if authenticated and not accepted) */}
                    {isAuthenticated && !user_acceptance_status.accepted && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <p className="text-gray-800 mb-4">
                          Please accept these Terms of Service to continue using BuildEasy.
                        </p>
                        <button
                          onClick={acceptTerms}
                          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                        >
                          I Accept the Terms of Service
                        </button>
                      </div>
                    )}
                    
                    {/* Sign in prompt (if not authenticated) */}
                    {!isAuthenticated && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <p className="text-gray-700 mb-4">
                          To accept these terms and use BuildEasy, please sign in or create an account.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            to="/login?redirect_url=/terms"
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center"
                          >
                            Sign In
                          </Link>
                          <Link
                            to="/register?redirect_url=/terms"
                            className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-center"
                          >
                            Create Account
                          </Link>
                        </div>
                      </div>
                    )}
                  </section>
                  
                  {/* Contact Section */}
                  <section className="mt-12 pt-8 border-t border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Questions About These Terms?
                    </h2>
                    <p className="text-gray-700 mb-4">
                      If you have any questions or concerns about these Terms of Service, please don't hesitate to contact us:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-6 space-y-2">
                      <p className="text-gray-800">
                        <strong>Email:</strong> <a href="mailto:legal@buildeasy.com" className="text-blue-600 hover:text-blue-700 underline">legal@buildeasy.com</a>
                      </p>
                      <p className="text-gray-800">
                        <strong>Phone:</strong> <a href="tel:1-800-BUILD-EZ" className="text-blue-600 hover:text-blue-700 underline">1-800-BUILD-EZ</a>
                      </p>
                      <p className="text-gray-800">
                        <strong>Support:</strong> <Link to="/support" className="text-blue-600 hover:text-blue-700 underline">Visit our Support Center</Link>
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </main>
          </div>
        </div>
        
        {/* Scroll to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 hidden lg:block"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </>
  );
};

export default UV_TermsOfService;