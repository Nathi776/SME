import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, User, FileText, CreditCard, Star, Users,
  ArrowRightLeft, FolderOpen, MessageSquare, HelpCircle, Settings, LogOut
} from "lucide-react";

const navSections = [
  {
    label: "",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { icon: User, label: "My Profile", path: "/profile" },
      { icon: FileText, label: "Invoices", path: "/invoices" },
      { icon: CreditCard, label: "Finance Requests", path: "/finance-requests" },
      { icon: Star, label: "Credit Score", path: "/credit-score" },
      { icon: Users, label: "Customers", path: "/customers" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { icon: ArrowRightLeft, label: "Transactions", path: "/transactions" },
      { icon: FolderOpen, label: "Documents", path: "/documents" },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { icon: MessageSquare, label: "Messages", path: "/messages" },
      { icon: HelpCircle, label: "Help Center", path: "/help" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-wide">SME FINANCE</h1>
            <p className="text-sidebar-foreground text-[10px] tracking-widest">Grow Your Business</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && (
                <p className="text-sidebar-foreground/50 text-[10px] font-semibold tracking-widest uppercase px-3 mb-2">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-sidebar-primary text-white shadow-lg shadow-sidebar-primary/30"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
