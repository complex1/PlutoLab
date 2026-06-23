import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Catalog from "@/components/Catalog";
import AppShell from "@/components/AppShell";
import { apps } from "@/registry/apps";

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Catalog />} />
          {apps.map((app) => (
            <Route
              key={app.id}
              path={app.route}
              element={<AppShell app={app} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-ring" />
      <span>Initializing...</span>
    </div>
  );
}
