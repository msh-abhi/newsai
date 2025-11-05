import React from 'react';
import businessCard from '../../assets/events-guide/business-card-new.png';

const BusinessCard = () => {
  return (
    <section className="py-6 sm:py-8 lg:py-10 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center max-w-6xl mx-auto">
          {/* Left side - Description */}
          <div className="flex flex-col justify-center h-full order-2 lg:order-1">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-gray-900 leading-tight" style={{ fontSize: '14px' }}>
                Victor Antunez is the Miami Autism Dad Helping Families with Special Needs Buy and Sell Homes with Confidence.
              </h2>
              <p className="text-base font-semibold text-blue-600 leading-tight">
                Your family deserves the best REPRESENTATION!
              </p>
              <ul className="space-y-1 text-gray-600" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 leading-tight">•</span>
                  <span>Specialized real estate guidance for families with special needs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 leading-tight">•</span>
                  <span>Expert insight into Miami's neighborhoods, schools, and local support resources</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 leading-tight">•</span>
                  <span>A trusted partner who understands the emotional and practical sides of buying and selling</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 leading-tight">•</span>
                  <span>Focused on creating stability, opportunity, and long-term peace of mind for your family</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 leading-tight">•</span>
                  <span>Work with someone who's not just a Realtor — but an Autism Dad who truly gets it</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right side - Business Card with Clickable Links */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <img
              src={businessCard}
              alt="Victor Antunez - Autism Advocate, Realtor at eXp Realty"
              className="w-full max-w-md rounded-lg shadow-2xl"
            />
            {/* Clickable overlay areas */}
            <a
              href="https://miamiautismrealestateagents.com/contact/"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-[8%] left-[35%] w-[55%] h-[6%] opacity-0 hover:opacity-10 bg-blue-600 transition-opacity"
              title="Visit miamiautismrealestateagents.com"
            />
            <a
              href="mailto:victor.antunez2@exprealty.com"
              className="absolute bottom-[14%] left-[35%] w-[55%] h-[5%] opacity-0 hover:opacity-10 bg-blue-600 transition-opacity"
              title="Email victor.antunez2@exprealty.com"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessCard;
