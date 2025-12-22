import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import BlogFooter from "@/components/BlogFooter";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - AI KDP Author</title>
        <meta name="description" content="Read our Privacy Policy to understand how AI KDP Author collects, uses, and protects your personal information when you use our AI-powered novel generation platform." />
        <meta property="og:title" content="Privacy Policy - AI KDP Author" />
        <meta property="og:description" content="Learn how AI KDP Author protects your privacy and handles your personal data." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/privacy" />
        <link rel="canonical" href="https://aikdpauthor.com/privacy" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-12">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight pb-2">
              AI KDP Author
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-3">
              Generate complete, publishable novels for Amazon KDP
            </p>
            <p className="text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              From idea to publication-ready manuscript in minutes. Create 50,000-80,000 word novels, audiobooks, and comprehensive analysis tools - all powered by advanced AI.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/">
            <Button variant="ghost" className="mb-8" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 md:p-12">
            <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">Privacy Policy</h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h3 className="text-2xl font-semibold mt-8 mb-4">Welcome to AI KDP Author</h3>
            <p>
              We understand that privacy online is important to users of our Site, especially when conducting business. 
              This statement governs our privacy policies with respect to those users of the Site ("Visitors") who visit 
              without transacting business and Visitors who register to transact business on the Site and make use of 
              the various services offered by AI KDP Author (collectively, "Services") ("Authorized Customers").
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Personally Identifiable Information</h3>
            <p>
              <strong>"Personally Identifiable Information"</strong> refers to any information that identifies or can be 
              used to identify, contact, or locate the person to whom such information pertains, including, but not limited 
              to, name, address, phone number, fax number, email address, financial profiles, social security number, and 
              credit card information. Personally Identifiable Information does not include information that is collected 
              anonymously (that is, without identification of the individual user) or demographic information not connected 
              to an identified individual.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">What Personally Identifiable Information is collected?</h3>
            <p>
              We may collect basic user profile information from all of our Visitors. We collect the following additional 
              information from our Authorized Customers: the names, addresses, phone numbers and email addresses of Authorized 
              Customers, the nature and size of the business, and the nature and size of the advertising inventory that the 
              Authorized Customer intends to purchase or sell.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">What organizations are collecting the information?</h3>
            <p>
              In addition to our direct collection of information, our third party service vendors (such as credit card companies, 
              clearinghouses and banks) who may provide such services as credit, insurance, and escrow services may collect this 
              information from our Visitors and Authorized Customers. We do not control how these third parties use such information, 
              but we do ask them to disclose how they use personal information provided to them from Visitors and Authorized Customers.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">How does the Site use Personally Identifiable Information?</h3>
            <p>
              We use Personally Identifiable Information to customize the Site, to make appropriate service offerings, and to 
              fulfill buying and selling requests on the Site. We may email Visitors and Authorized Customers about research or 
              purchase and selling opportunities on the Site or information related to the subject matter of the Site. We may also 
              use Personally Identifiable Information to contact Visitors and Authorized Customers in response to specific inquiries, 
              or to provide requested information.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">With whom may the information may be shared?</h3>
            <p>
              Personally Identifiable Information about Authorized Customers may be shared with other Authorized Customers who wish 
              to evaluate potential transactions with other Authorized Customers. We may share aggregated information about our Visitors, 
              including the demographics of our Visitors and Authorized Customers, with our affiliated agencies and third party vendors. 
              We also offer the opportunity to "opt out" of receiving information or being contacted by us or by any agency acting on our behalf.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">How is Personally Identifiable Information stored?</h3>
            <p>
              Personally Identifiable Information collected by AI KDP Author is securely stored and is not accessible to third parties 
              or employees of AI KDP Author except for use as indicated above.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">What choices are available to Visitors regarding collection, use and distribution of the information?</h3>
            <p>
              Visitors and Authorized Customers may opt out of receiving unsolicited information from or being contacted by us and/or 
              our vendors and affiliated agencies by responding to emails as instructed, or by contacting us at boundlessvolumes@gmail.com
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Are Cookies Used on the Site?</h3>
            <p>
              Cookies are used for a variety of reasons. We use Cookies to obtain information about the preferences of our Visitors 
              and the services they select. We also use Cookies for security purposes to protect our Authorized Customers. For example, 
              if an Authorized Customer is logged on and the site is unused for more than 10 minutes, we will automatically log the 
              Authorized Customer off.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">What partners or service providers have access to Personally Identifiable Information?</h3>
            <p>
              AI KDP Author has entered into and will continue to enter into partnerships and other affiliations with a number of vendors. 
              Such vendors may have access to certain Personally Identifiable Information on a need to know basis for evaluating Authorized 
              Customers for service eligibility. Our privacy policy does not cover their collection or use of this information.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">How does the Site keep Personally Identifiable Information secure?</h3>
            <p>
              All of our employees are familiar with our security policy and practices. The Personally Identifiable Information of our 
              Visitors and Authorized Customers is only accessible to a limited number of qualified employees who are given a password 
              in order to gain access to the information. We audit our security systems and processes on a regular basis. Sensitive 
              information, such as credit card numbers or social security numbers, is protected by encryption protocols, in place to 
              protect information sent over the Internet.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">How can Visitors correct any inaccuracies in Personally Identifiable Information?</h3>
            <p>
              Visitors and Authorized Customers may contact us to update Personally Identifiable Information about them or to correct 
              any inaccuracies by emailing us at boundlessvolumes@gmail.com.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Can a Visitor delete or deactivate Personally Identifiable Information?</h3>
            <p>
              We provide Visitors and Authorized Customers with a mechanism to delete/deactivate Personally Identifiable Information 
              from the Site's database by contacting us. However, because of backups and records of deletions, it may be impossible to 
              delete a Visitor's entry without retaining some residual information. An individual who requests to have Personally 
              Identifiable Information deactivated will have this information functionally deleted, and we will not sell, transfer, or 
              use Personally Identifiable Information relating to that individual in any way moving forward.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">What happens if the Privacy Policy Changes?</h3>
            <p>
              We will let our Visitors and Authorized Customers know about changes to our privacy policy by posting such changes on the 
              Site. However, if we are changing our privacy policy in a manner that might cause disclosure of Personally Identifiable 
              Information that a Visitor or Authorized Customer has previously requested not be disclosed, we will contact such Visitor 
              or Authorized Customer to allow such Visitor or Authorized Customer to prevent such disclosure.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Links</h3>
            <p>
              AI KDP Author contains links to other websites. Please note that when you click on one of these links, you are moving to 
              another website. We encourage you to read the privacy statements of these linked sites as their privacy policies may differ 
              from ours.
            </p>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last Updated: October 2025
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <BlogFooter />
      </div>
    </>
  );
}
