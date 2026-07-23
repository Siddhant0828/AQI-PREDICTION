import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function Layout({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  return (
    <div className="app-bg min-h-screen">
      <Sidebar dark={dark} />
      <Navbar dark={dark} onToggleDark={onToggleDark} />
      <main className="pt-16 md:pl-64">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-4 md:p-6"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
