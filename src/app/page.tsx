'use client'

import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useConvexStoryStore } from "@/lib/convex-store"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Story } from "@/lib/convex-store"
import { BookOpen, Plus, ArrowRight, Settings, Lightbulb, FolderOpen, LayoutDashboard } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }

  return <DashboardContent />
}

function DashboardContent() {
  const router = useRouter()
  const stories = useQuery(api.stories.getStories)
  const setCurrentStory = useConvexStoryStore(state => state.setCurrentStory)

  const handleContinueStory = (story: Story) => {
    setCurrentStory(story)
    router.push('/story')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (stories === undefined) return <div>Loading...</div>
  if (!stories) return <div>Unable to load stories. Please check your connection.</div>

  const recentStories = stories.slice(0, 3)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center p-6 border-b border-gray-200">
          <BookOpen className="h-8 w-8 text-purple-500" />
          <span className="text-xl font-bold ml-2 text-gray-800">StoryGenPro</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a className="flex items-center px-4 py-2 text-gray-700 bg-purple-100 rounded-lg font-semibold">
            <LayoutDashboard className="h-5 w-5 mr-3" />
            Dashboard
          </a>
          <button 
            onClick={() => router.push('/projects')}
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full text-left"
          >
            <FolderOpen className="h-5 w-5 mr-3" />
            Projects
          </button>
          <a className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </a>
          <a className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            <Lightbulb className="h-5 w-5 mr-3" />
            Feedback
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div></div>
            <button 
              onClick={() => router.push('/framework')}
              className="flex items-center justify-center bg-purple-500 text-white py-2 px-4 rounded-lg shadow-sm hover:bg-purple-600 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Story
            </button>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Recent Stories</h2>
              {stories.length > 3 && (
                <button 
                  onClick={() => router.push('/projects')}
                  className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-800"
                >
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </button>
              )}
            </div>

            {stories.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No stories yet</h3>
                <p className="text-gray-500 mb-4">Create your first story to get started</p>
                <button 
                  onClick={() => router.push('/framework')}
                  className="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Create Your First Story
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentStories.map((story) => {
                  const completedBeats = story.beats.filter(beat => beat.completed).length
                  const progress = (completedBeats / story.beats.length) * 100

                  return (
                    <div key={story._id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-gray-900">{story.title}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Last edited {formatDate(story.lastEdited)}
                        </p>
                        <div className="flex items-center mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-purple-500 h-1.5 rounded-full" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600 ml-3">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-6">
                        <button 
                          onClick={() => handleContinueStory(story)}
                          className="w-full bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-md hover:bg-purple-200 transition-colors text-sm"
                        >
                          Continue Writing
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
