import { Tenor_Sans, League_Spartan } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { AuthProvider } from "@/lib/AuthContext";
import { MemberAuthProvider } from "@/lib/MemberAuthContext";

const tenor = Tenor_Sans({
  variable: "--font-tenor",
  weight: "400",
  subsets: ["latin"],
});

const spartan = League_Spartan({
  variable: "--font-spartan",
  subsets: ["latin"],
});

export const metadata = {
  title: "Resume Database | Alpha Kappa Psi - Georgia Tech",
  description: "A searchable database of member resumes for Alpha Kappa Psi at Georgia Tech",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${tenor.variable} ${spartan.variable} antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <MemberAuthProvider>
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </MemberAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
