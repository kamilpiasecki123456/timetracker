import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Control del tiempo de los empleados</CardTitle>
          <CardDescription>Realice un seguimiento eficaz de sus horas de trabajo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Link href="/login">
              <Button className="w-full" size="lg">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full" size="lg">
                Register
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

