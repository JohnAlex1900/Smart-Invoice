import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Shield, Smartphone, TrendingUp, Users } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-teal-600 text-white px-3 py-2 rounded-lg font-bold text-lg">
                InvoicePro
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={scrollToFeatures}
                className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium"
              >
                Features
              </button>
              <Button
                variant="ghost"
                onClick={() => setLocation("/auth")}
              >
                Login
              </Button>
              <Button
                onClick={() => setLocation("/auth")}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Simplify Your Business Invoicing with One Click
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto">
            A cloud-based invoicing solution tailored for Small and Medium Enterprises. 
            Create professional invoices, track payments, and manage clients effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation("/auth")}
              className="bg-teal-600 hover:bg-teal-700 text-lg px-8 py-3"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToFeatures}
              className="text-lg px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Why SMEs Struggle with Invoicing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Traditional invoicing methods create unnecessary friction and waste valuable time
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Manual Errors</h3>
                <p className="text-slate-600">
                  Excel and paper invoicing leads to calculation mistakes and formatting inconsistencies
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Time Wasted</h3>
                <p className="text-slate-600">
                  Chasing payments and managing client communications takes hours each week
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Complex Tools</h3>
                <p className="text-slate-600">
                  Existing solutions are either too expensive or too complicated for small businesses
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-12">
            <div className="inline-flex items-center bg-red-50 text-red-700 px-6 py-3 rounded-full">
              <span className="font-semibold text-lg">35% of SME invoicing fails due to poor tools</span>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Our Solution: Cloud-Based Simplicity
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage invoices professionally, without the complexity
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Invoice Generation in Seconds</h3>
                <p className="text-slate-600">
                  Create professional invoices with just a few clicks using our intuitive interface
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Secure Cloud Access 24/7</h3>
                <p className="text-slate-600">
                  Access your invoices and client data securely from anywhere, anytime
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Payment & Client Tracking</h3>
                <p className="text-slate-600">
                  Monitor payment status and manage client relationships in one central dashboard
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Mobile-Friendly Design</h3>
                <p className="text-slate-600">
                  Work on the go with our responsive design that works perfectly on any device
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Free Forever Plan</h3>
                <p className="text-slate-600">
                  Start with our completely free plan - no credit card required, no hidden fees
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Benefits for SMEs
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Real results that impact your bottom line
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-teal-500 to-blue-600 text-white rounded-2xl p-8 mb-4">
                <div className="text-4xl font-bold mb-2">10+</div>
                <div className="text-lg">Hours Saved Weekly</div>
              </div>
              <p className="text-slate-600">
                "InvoicePro reduced my invoicing time from hours to minutes. I can focus on growing my business instead of paperwork."
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl p-8 mb-4">
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-lg">Access Anywhere</div>
              </div>
              <p className="text-slate-600">
                "Whether I'm at the office or traveling, I can track client payments and send invoices instantly from any device."
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-8 mb-4">
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-lg">Professional Look</div>
              </div>
              <p className="text-slate-600">
                "My invoices look so much more professional now. Clients take my business more seriously and pay faster."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">
            Start Your Free Account Today
          </h2>
          <p className="text-xl mb-10 opacity-90">
            Join thousands of SMEs who have simplified their invoicing process. 
            No credit card required, no setup fees, no contracts.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/auth")}
            className="bg-white text-teal-600 hover:bg-slate-100 text-lg px-10 py-4 font-semibold"
          >
            Create Your Account
          </Button>
          <div className="mt-8 text-sm opacity-75">
            ✓ Free forever plan available  ✓ No credit card required  ✓ Set up in under 2 minutes
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="bg-teal-600 text-white px-3 py-2 rounded-lg font-bold text-lg inline-block">
                InvoicePro
              </div>
              <p className="text-slate-400 mt-2">Simplifying invoicing for SMEs worldwide</p>
            </div>
            <div className="flex space-x-6">
              <button 
                onClick={scrollToFeatures}
                className="text-slate-400 hover:text-white"
              >
                Features
              </button>
              <button 
                onClick={() => setLocation("/auth")}
                className="text-slate-400 hover:text-white"
              >
                Login
              </button>
              <button 
                onClick={() => setLocation("/auth")}
                className="text-slate-400 hover:text-white"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}