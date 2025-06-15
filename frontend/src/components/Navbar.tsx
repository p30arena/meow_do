import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet"; // Import SheetTitle
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"; // Import AlertDialog components
import { Menu, Settings } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import TimezoneSelector from "./settings/TimezoneSelector"; // Import TimezoneSelector
import InstallPWAButton from "./InstallPWAButton"; // Import InstallPWAButton
import WorkspaceInvitations from "./workspace/WorkspaceInvitations"; // Import WorkspaceInvitations

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation(); // Destructure i18n
  const { logout } = useAuth();
  const navigate = useNavigate();

  const isRtl = i18n.language === "ar" || i18n.language === "fa"; // Determine RTL

  return (
    <nav className="bg-primary text-primary-foreground p-4 flex items-center justify-between w-full fixed top-0 z-50">
      <Link to="/" className="text-lg font-bold flex items-center">
        <img src="/logo.png" alt="MeowDo Logo" className="w-8 h-8 rounded-full mx-2" />
        MeowDo
      </Link>

            {/* Mobile Navigation */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side={isRtl ? "left" : "right"}
                        className="w-[200px] sm:w-[250px] p-4"
                    >
                        {" "}
                        {/* Dynamic side */}
                        <SheetTitle className="sr-only">Main Navigation</SheetTitle>
                        <div className="flex flex-col space-y-4">
                            <InstallPWAButton />
                            <LanguageSwitcher />
                            <ThemeToggle />
                {/* Invitations Button for Mobile */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      {t("workspace.invitations")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("workspace.invitations")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("workspace.invitationsDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <WorkspaceInvitations />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t("close")}</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* Settings Button for Mobile */}
                <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="me-2 h-4 w-4" />{" "}
                    {/* Changed mr-2 to me-2 */}
                    {t("settings.title")}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isRtl ? "left" : "right"}
                  className="w-[200px] sm:w-[250px] p-4"
                >
                  {" "}
                  {/* Dynamic side */}
                  <SheetTitle>{t("settings.title")}</SheetTitle>
                  <div className="flex flex-col space-y-4">
                    <TimezoneSelector />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          {t("auth.logout")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("auth.confirmLogoutTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("auth.confirmLogoutDescription")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { logout(); navigate('/'); }}>
                            {t("confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </SheetContent>
        </Sheet>
      </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
                <InstallPWAButton />
                <LanguageSwitcher />
                <ThemeToggle />
                {/* Invitations Button for Desktop */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost">
                      {t("workspace.invitations")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("workspace.invitations")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("workspace.invitationsDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <WorkspaceInvitations />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t("close")}</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* Settings Button for Desktop */}
                <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost">
              <Settings className="me-2 h-4 w-4" /> {/* Changed mr-2 to me-2 */}
              {t("settings.title")}
            </Button>
          </SheetTrigger>
          <SheetContent
            side={isRtl ? "left" : "right"}
            className="w-[200px] sm:w-[250px] p-4"
          >
            {" "}
            {/* Dynamic side */}
            <SheetTitle>{t("settings.title")}</SheetTitle>
            <div className="flex flex-col space-y-4">
              <TimezoneSelector />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    {t("auth.logout")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("auth.confirmLogoutTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("auth.confirmLogoutDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { logout(); navigate('/'); }}>
                {t("confirm")}
              </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
