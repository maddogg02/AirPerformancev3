import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Target, Users, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Shield className="h-8 w-8" />
          <h1 className="text-xl font-semibold">AF Performance Tracker</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full p-6 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Transform Your Achievements
          </h2>
          <p className="text-muted-foreground">
            Capture your daily wins and turn them into promotion-worthy performance statements with AI-powered refinement.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Quick AIR Entry</h3>
                <p className="text-sm text-muted-foreground">
                  Capture Action, Impact, Result in under 20 seconds
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-medium">AI-Powered Refinement</h3>
                <p className="text-sm text-muted-foreground">
                  5-step mandatory process with feedback and improvement
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-destructive/10 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium">Professional Statements</h3>
                <p className="text-sm text-muted-foreground">
                  Export ready-to-use EPB statements
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Secure authentication powered by your existing account
          </p>
        </div>
      </main>
    </div>
  );
}
