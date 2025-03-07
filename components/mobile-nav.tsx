"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signOut } from "@/lib/actions/auth"
import { LogOut, Menu, User, UserCog } from "lucide-react"
import Link from "next/link"

interface MobileNavProps {
  isAdmin?: boolean
  currentPath: "admin" | "dashboard"
}

export function MobileNav({ isAdmin, currentPath }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-2 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="px-0">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col justify-between gap-4">
          {isAdmin && currentPath === "dashboard" && (
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <UserCog className="mr-2 h-5 w-5" />
                Panel de administración
              </Button>
            </Link>
          )}
          {currentPath === "admin" && (
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-2 h-5 w-5" />
                Panel de usuario
              </Button>
            </Link>
          )}
          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

