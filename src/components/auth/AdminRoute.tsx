import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user } = useAuth();
  // Lista de emails de administradores
  const adminEmails = [
    'felipe.rodres@gmail.com',
    'admin@wipsy.com',
    // Agrega aquí los emails de los administradores
  ];
  
  const isAdmin = user?.email && adminEmails.includes(user.email);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos de administrador para acceder a esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};