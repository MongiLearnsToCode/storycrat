'use client'

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { BookOpen, Sparkles, Users, BarChart3, ArrowRight } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b p-4 lg:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            <h1 className="text-xl lg:text-2xl font-bold">StoryGenPro</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 lg:py-20 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 lg:mb-6">
            AI-Powered Story Creation
          </Badge>
          <h2 className="text-3xl lg:text-5xl xl:text-6xl font-bold mb-4 lg:mb-6">
            Structured Storytelling
            <span className="block text-primary">Made Simple</span>
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground mb-8 lg:mb-12 max-w-2xl mx-auto">
            Transform your ideas into complete stories using proven frameworks with AI-powered suggestions and guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-base lg:text-lg h-12 lg:h-14 px-6 lg:px-8"
              onClick={() => router.push('/framework')}
            >
              Start Writing
              <ArrowRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base lg:text-lg h-12 lg:h-14 px-6 lg:px-8"
              onClick={() => router.push('/projects')}
            >
              View Projects
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 lg:py-20 px-4 lg:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 lg:mb-16">
            <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-4">
              Everything You Need to Write
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional storytelling tools designed for writers of all levels
            </p>
          </div>
          
          <div className="grid gap-6 lg:gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg lg:text-xl">Framework-Guided</CardTitle>
                <CardDescription className="text-base">
                  Write with proven story structures like the Hero&apos;s Journey
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg lg:text-xl">AI Suggestions</CardTitle>
                <CardDescription className="text-base">
                  Get contextual writing prompts and creative inspiration
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg lg:text-xl">Character Management</CardTitle>
                <CardDescription className="text-base">
                  Track characters, roles, and relationships in your story
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg lg:text-xl">Progress Tracking</CardTitle>
                <CardDescription className="text-base">
                  Visual progress indicators and completion tracking
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg lg:text-xl">Auto-Save</CardTitle>
                <CardDescription className="text-base">
                  Never lose your work with automatic saving
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg lg:text-xl">Export Options</CardTitle>
                <CardDescription className="text-base">
                  Export your finished stories in multiple formats
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
