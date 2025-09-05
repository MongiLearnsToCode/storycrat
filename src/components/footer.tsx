
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap justify-center -mx-5 -my-2">
          <div className="px-5 py-2">
            <Link href="/" className="text-base text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/projects" className="text-base text-muted-foreground hover:text-foreground">
              Projects
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/framework" className="text-base text-muted-foreground hover:text-foreground">
              Frameworks
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/contact" className="text-base text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/terms" className="text-base text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/privacy" className="text-base text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </nav>
        <div className="mt-8 text-center">
          <p className="text-base text-muted-foreground">&copy; {new Date().getFullYear()} StoryGenPro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
