import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useFlows } from '@/hooks/useFlows';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Workflow, TrendingUp, Play, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FlowEditor } from '@/components/automations/FlowEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Automations() {
  const { flows, isLoading, toggleActive, createFlow, deleteFlow } = useFlows();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null);

  const handleCreateFlow = async () => {
    setIsCreating(true);
    const newFlow = await createFlow('Nuevo Flujo de Bienvenida', 'welcome');
    if (newFlow) {
      setSelectedFlowId(newFlow.id);
    }
    setIsCreating(false);
  };

  const handleDeleteFlow = async () => {
    if (deleteFlowId) {
      deleteFlow(deleteFlowId);
      setDeleteFlowId(null);
    }
  };

  const selectedFlow = flows?.find(f => f.id === selectedFlowId);

  if (selectedFlow) {
    return (
      <DashboardLayout>
        <FlowEditor
          flow={selectedFlow}
          onBack={() => setSelectedFlowId(null)}
        />
      </DashboardLayout>
    );
  }

  const activeFlows = flows?.filter(f => f.is_active).length || 0;
  const totalFlows = flows?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Automatizaciones</h1>
            </div>
            <p className="text-muted-foreground text-base max-w-2xl">
              Crea flujos automáticos inteligentes para darle la bienvenida a tus clientes y mejorar su experiencia
            </p>
          </div>
          <Button 
            onClick={handleCreateFlow} 
            disabled={isCreating}
            size="lg"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Flujo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 hover:border-primary/50 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Flujos Activos</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Workflow className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {activeFlows}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeFlows === 1 ? 'flujo en ejecución' : 'flujos en ejecución'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 hover:border-primary/50 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Flujos</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">{totalFlows}</div>
                <p className="text-xs text-muted-foreground">
                  {totalFlows === 1 ? 'flujo creado' : 'flujos creados'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-2 hover:border-primary/50 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ejecuciones</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">-</div>
                <p className="text-xs text-muted-foreground">Próximamente</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Flows List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">Mis Flujos</h2>
            {flows && flows.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {totalFlows} {totalFlows === 1 ? 'flujo' : 'flujos'}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : flows && flows.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {flows.map((flow, index) => (
                <motion.div
                  key={flow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group"
                    onClick={() => setSelectedFlowId(flow.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {flow.name}
                            </CardTitle>
                            <Badge 
                              variant={flow.flow_type === 'welcome' ? 'default' : 'secondary'}
                              className="shrink-0"
                            >
                              {flow.flow_type === 'welcome' ? 'Bienvenida' : flow.flow_type}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">
                            Flujo automático de {flow.flow_type === 'welcome' ? 'bienvenida' : 'automatización'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFlowId(flow.id);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteFlowId(flow.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={flow.is_active}
                            onCheckedChange={(checked) => {
                              toggleActive(flow.id, checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={`text-sm font-medium ${flow.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {flow.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFlowId(flow.id);
                          }}
                        >
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16">
                <div className="text-center max-w-md mx-auto">
                  <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Workflow className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">No hay flujos creados</h3>
                  <p className="text-muted-foreground mb-6">
                    Crea tu primer flujo de bienvenida para automatizar tus respuestas y mejorar la experiencia de tus clientes
                  </p>
                  <Button 
                    onClick={handleCreateFlow} 
                    disabled={isCreating}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Crear Primer Flujo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFlowId} onOpenChange={() => setDeleteFlowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este flujo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El flujo será eliminado permanentemente junto con todos sus pasos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
