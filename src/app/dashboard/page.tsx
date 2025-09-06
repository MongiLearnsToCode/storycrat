'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@clerk/nextjs"
import { Briefcase, LayoutGrid, ListChecks, Plus, User, Users } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useUser()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <p className="text-sm text-muted-foreground">{today.replace(/,/g, '')}</p>
          <h2 className="text-3xl font-bold tracking-tight">{getGreeting()}, {user?.firstName || 'User'}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Customize
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Briefcase className="h-4 w-4 mr-2 text-primary" />
              Recent Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">A Deal With Dax</p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Avatar className="h-5 w-5 mr-1">
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">SM</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <ListChecks className="h-4 w-4 mr-2 text-primary" />
              My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <div className="flex flex-col items-center justify-center h-full pt-4">
              <ListChecks className="h-8 w-8 mb-4 text-gray-300" />
              <p className="text-sm">No task cards assigned to you</p>
              <Button variant="link" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                View Task Boards
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-2 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <div className="flex flex-col items-center justify-center h-full pt-4">
                <User className="h-8 w-8 mb-4 text-gray-300" />
                <p className="text-sm">No recent activity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2 text-primary" />
              My Team
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center space-x-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
              </Avatar>
              <p className="font-semibold mt-2 text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">Owner</p>
            </div>
            <div className="flex flex-col items-center">
              <Button variant="outline" className="rounded-full h-12 w-12 p-0">
                <Plus className="h-6 w-6" />
              </Button>
              <p className="font-semibold mt-2 text-sm">Invite User</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
