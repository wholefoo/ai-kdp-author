import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import BlogFooter from "@/components/BlogFooter";

export default function TermsOfUse() {
  return (
    <>
      <Helmet>
        <title>Terms of Use - AI KDP Author</title>
        <meta name="description" content="Read the Terms of Use for AI KDP Author. Understand your rights and responsibilities when using our AI-powered book generation and publishing platform." />
        <meta property="og:title" content="Terms of Use - AI KDP Author" />
        <meta property="og:description" content="Review the terms and conditions governing the use of AI KDP Author's services." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aikdpauthor.com/terms" />
        <link rel="canonical" href="https://aikdpauthor.com/terms" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 py-12">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight pb-2">
              AI KDP Author
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-3">
              Generate complete, publishable fiction and non-fiction books for Amazon KDP
            </p>
            <p className="text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              From idea to publication-ready manuscript in minutes. Create 50,000-80,000 word books and comprehensive analysis tools - all powered by advanced AI.
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
            <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">Terms of Use</h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-8">
              <p className="font-bold text-yellow-800 dark:text-yellow-200">PLEASE READ!</p>
              <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                AI KDP Author requires consideration for and as a condition of allowing you access.
              </p>
            </div>

            <p>
              READING AND ACCEPTING THE TERMS OF USE AND READING AND ACCEPTING THE PROVISIONS OF THE PRIVACY POLICY OF 
              AI KDP Author ARE REQUIRED CONSIDERATIONS FOR AI KDP Author GRANTING YOU THE RIGHT TO VISIT, READ OR INTERACT WITH IT.
            </p>

            <p className="font-bold">
              ALL PERSONS ARE DENIED ACCESS TO THIS SITE UNLESS THEY READ AND ACCEPT THE TERMS OF USE AND THE PRIVACY POLICY.
            </p>

            <p>
              BY VIEWING, VISITING, USING, OR INTERACTING WITH AI KDP Author OR WITH ANY BANNER, POP-UP, OR ADVERTISING THAT 
              APPEARS ON IT, YOU ARE AGREEING TO ALL THE PROVISIONS OF THIS TERMS OF USE POLICY AND THE PRIVACY POLICY OF AI KDP Author.
            </p>

            <p>
              ALL PERSONS UNDER THE AGE OF 18 ARE DENIED ACCESS TO AI KDP Author. IF YOU ARE UNDER 18 YEARS OF AGE, IT IS UNLAWFUL 
              FOR YOU TO VISIT, READ, OR INTERACT WITH AI KDP Author OR ITS CONTENTS IN ANY MANNER. AI KDP Author SPECIFICALLY DENIES 
              ACCESS TO ANY INDIVIDUAL THAT IS COVERED BY THE CHILD ONLINE PRIVACY ACT (COPA) OF 1998.
            </p>

            <p>
              AI KDP Author RESERVES THE RIGHT TO DENY ACCESS TO ANY PERSON OR VIEWER FOR ANY REASON. UNDER THE TERMS OF THE PRIVACY 
              POLICY, WHICH YOU ACCEPT AS A CONDITION FOR VIEWING, AI KDP Author IS ALLOWED TO COLLECT AND STORE DATA AND INFORMATION 
              FOR THE PURPOSE OF EXCLUSION AND FOR MANY OTHER USES.
            </p>

            <p>
              THE TERMS OF USE AGREEMENT MAY CHANGE FROM TIME TO TIME. VISITORS HAVE AN AFFIRMATIVE DUTY, AS PART OF THE CONSIDERATION 
              FOR PERMISSION TO VIEW AI KDP Author, TO KEEP THEMSELVES INFORMED OF CHANGES.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Parties to the Terms of Use Agreement</h3>
            <p>
              Visitors, viewers, users, subscribers, members, affiliates, or customers, collectively referred to herein as "Visitors," 
              are parties to this agreement. The website and its owners and/or operators are parties to this agreement, herein referred 
              to as "Website."
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Use of Information from this Website</h3>
            <p>
              Unless you have entered into an express written contract with this website to the contrary, visitors, viewers, subscribers, 
              members, affiliates, or customers have no right to use this information in a commercial or public setting; they have no right 
              to broadcast it, copy it, save it, print it, sell it, or publish any portions of the content of this website. By viewing the 
              contents of this website you agree this condition of viewing and you acknowledge that any unauthorized use is unlawful.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Ownership of Website or Right to Use, Sell, Publish Contents of this Website</h3>
            <p>
              The website and its contents are owned or licensed by the website. Material contained on the website must be presumed to be 
              proprietary and copyrighted. Visitors have no rights whatsoever in the site content. Use of website content for any reason 
              is unlawful unless it is done with express contract or permission of the website.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Hyperlinking to Site, Co-Branding, "Framing" and Referencing Site Prohibited</h3>
            <p>
              Unless expressly authorized by website, no one may hyperlink this site, or portions thereof, (including, but not limited to, 
              logotypes, trademarks, branding or copyrighted material) to theirs for any reason. Further, you are not allowed to reference 
              the url (website address) of this website in any commercial or non-commercial media without express permission, nor are you 
              allowed to 'frame' the site.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Disclaimer for Contents of Site</h3>
            <p>
              The website disclaims any responsibility for the accuracy of the content of this website. Visitors assume the all risk of 
              viewing, reading, using, or relying upon this information. Unless you have otherwise formed an express contract to the contrary 
              with the website, you have no right to rely on any information contained herein as accurate. The website makes no such warranty.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Disclaimer for Harm Caused to Your Computer or Software</h3>
            <p>
              The website assumes no responsibility for damage to computers or software of the visitor or any person the visitor subsequently 
              communicates with from corrupting code or data that is inadvertently passed to the visitor's computer. Visitor views and 
              interacts with this site, or banners or pop-ups or advertising displayed thereon, at their own risk.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Disclaimer for Harm Caused by Downloads</h3>
            <p>
              Visitor downloads information from this site at their own risk. Website makes no warranty that downloads are free of corrupting 
              computer codes, including, but not limited to, viruses and worms.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Limitation of Liability</h3>
            <p>
              By viewing, using, or interacting in any manner with this site, including banners, advertising, or pop-ups, downloads, and as 
              a condition of the website to allow lawful viewing, Visitor forever waives all right to claims of damage of any and all 
              description based on any causal factor resulting in any possible harm, no matter how heinous or extensive, whether physical or 
              emotional, foreseeable or unforeseeable, whether personal or business in nature.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Indemnification</h3>
            <p>
              Visitor agrees that in the event they cause damage, which the Website is required to pay for, the Visitor, as a condition of 
              viewing, promises to reimburse the Website for all such costs.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Submissions</h3>
            <p>
              Visitor agrees as a condition of viewing, that any communication between Visitor and Website is deemed a submission. All 
              submissions, including portions thereof, graphics contained thereon, or any of the content of the submission, shall become 
              the exclusive property of the Website and may be used, without further permission, for commercial use without additional 
              consideration of any kind.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Notice</h3>
            <p>
              No additional notice of any kind for any reason is due Visitor and Visitor expressly warrants an understanding that the right 
              to notice is waived as a condition for permission to view or interact with the website.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Disputes</h3>
            <p>
              As part of the consideration that the Website requires for viewing, using or interacting with this website, Visitor agrees to 
              use binding arbitration for any claim, dispute, or controversy ("CLAIM") of any kind (whether in contract, tort or otherwise) 
              arising out of or relating to this purchase, this product, including solicitation issues, privacy issues, and terms of use issues.
            </p>
            <p>
              Arbitration shall be conducted pursuant to the rules of the American Arbitration Association which are in effect on the date a 
              dispute is submitted to the American Arbitration Association. Information about the American Arbitration Association, its rules, 
              and its forms are available from the American Arbitration Association, 335 Madison Avenue, Floor 10, New York, New York, 10017-4605.
            </p>
            <p>
              In no case shall the viewer, visitor, member, subscriber or customer have the right to go to court or have a jury trial. The 
              arbitrator's decision will be final and binding with limited rights of appeal.
            </p>
            <p>
              The prevailing party shall be reimbursed by the other party for any and all costs associated with the dispute arbitration, 
              including attorney fees, collection fees, investigation fees, travel expenses.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Jurisdiction and Venue</h3>
            <p>
              If any matter concerning this purchase shall be brought before a court of law, pre- or post-arbitration, Viewer, visitor, member, 
              subscriber or customer agrees to that the sole and proper jurisdiction to be the state and city declared in the contact information 
              of the web owner. In the event that litigation is in a federal court, the proper court shall be the closest federal court to the 
              Seller's address.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Applicable Law</h3>
            <p>
              Viewer, visitor, member, subscriber or customer agrees that the applicable law to be applied shall, in all cases, be that of the 
              state of the Seller.
            </p>

            <h3 className="text-2xl font-semibold mt-8 mb-4">Contact Information</h3>
            <p>
              AI KDP Author<br />
              Keizer, Oregon<br />
              USA<br />
              Contact Email: boundlessvolumes@gmail.com
            </p>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last Updated: October 2025<br />
                All Rights Reserved.
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
