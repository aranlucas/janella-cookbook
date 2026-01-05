import { AppLayout } from "@/components/layout/app-layout";

export default function DashboardPage() {
  return (
    <AppLayout
      contentType="dashboard"
      title="Dashboard"
      description="An overview of your recipes and activities."
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Total Recipes</h3>
          <p className="text-3xl font-bold">42</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Favorites</h3>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Categories</h3>
          <p className="text-3xl font-bold">8</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-semibold">Recently Added</h3>
          <p className="text-3xl font-bold">3</p>
        </div>
      </div>
    </AppLayout>
  );
}
