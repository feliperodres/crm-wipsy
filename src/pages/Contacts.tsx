import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  Plus,
  Filter,
  MoreVertical,
  Star,
  UserPlus,
  Tag as TagIcon
} from 'lucide-react';
import { useState } from 'react';
import { TagManager } from '@/components/customers/TagManager';
import { CustomerTagSelector } from '@/components/customers/CustomerTagSelector';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  location?: string;
  lastInteraction: string;
  status: 'customer' | 'lead' | 'prospect';
  isFavorite: boolean;
  totalOrders: number;
  totalSpent: number;
  notes?: string;
}

const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Maria Rodriguez',
    phone: '+52 555 123 4567',
    email: 'maria.rodriguez@email.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c9f8?w=40&h=40&fit=crop&crop=face',
    location: 'Mexico City',
    lastInteraction: '2 min ago',
    status: 'customer',
    isFavorite: true,
    totalOrders: 8,
    totalSpent: 567.50,
    notes: 'Prefers blue dresses, size M'
  },
  {
    id: '2',
    name: 'Carlos Mendez',
    phone: '+52 555 234 5678',
    email: 'carlos.mendez@email.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
    location: 'Guadalajara',
    lastInteraction: '15 min ago',
    status: 'lead',
    isFavorite: false,
    totalOrders: 2,
    totalSpent: 89.99,
    notes: 'Interested in bulk purchases'
  },
  {
    id: '3',
    name: 'Ana Lopez',
    phone: '+52 555 345 6789',
    email: 'ana.lopez@email.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
    location: 'Monterrey',
    lastInteraction: '1 hour ago',
    status: 'customer',
    isFavorite: true,
    totalOrders: 15,
    totalSpent: 1234.75,
    notes: 'VIP customer, always orders seasonal collections'
  },
  {
    id: '4',
    name: 'Diego Santos',
    phone: '+52 555 456 7890',
    location: 'Puebla',
    lastInteraction: '2 hours ago',
    status: 'prospect',
    isFavorite: false,
    totalOrders: 0,
    totalSpent: 0,
    notes: 'Interested in men\'s accessories'
  },
  {
    id: '5',
    name: 'Sofia Herrera',
    phone: '+52 555 567 8901',
    email: 'sofia.herrera@email.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face',
    location: 'Cancun',
    lastInteraction: '3 hours ago',
    status: 'customer',
    isFavorite: false,
    totalOrders: 5,
    totalSpent: 345.20,
    notes: 'Loves summer collections'
  },
  {
    id: '6',
    name: 'Roberto Jimenez',
    phone: '+52 555 678 9012',
    email: 'roberto.jimenez@email.com',
    location: 'Tijuana',
    lastInteraction: '1 day ago',
    status: 'lead',
    isFavorite: false,
    totalOrders: 1,
    totalSpent: 45.99,
    notes: 'First-time buyer'
  }
];

const getStatusColor = (status: Contact['status']) => {
  switch (status) {
    case 'customer': return 'bg-green-500';
    case 'lead': return 'bg-blue-500';
    case 'prospect': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

const getStatusLabel = (status: Contact['status']) => {
  switch (status) {
    case 'customer': return 'Customer';
    case 'lead': return 'Lead';
    case 'prospect': return 'Prospect';
    default: return 'Unknown';
  }
};

const Contacts = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(mockContacts[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Contact['status'] | 'all'>('all');

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contact.phone.includes(searchQuery) ||
                          contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground">Manage your customer relationships</p>
          </div>
          <div className="flex gap-3">
            <TagManager />
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-elegant">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Contacts List */}
          <Card className="shadow-card border-0 lg:col-span-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">All Contacts</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {filteredContacts.length} contacts
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search contacts..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-1">
                  {['all', 'customer', 'lead', 'prospect'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status as any)}
                      className="text-xs"
                    >
                      {status === 'all' ? 'All' : getStatusLabel(status as Contact['status'])}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedContact?.id === contact.id ? 'bg-accent border-r-2 border-primary' : ''
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(contact.status)}`} />
                      {contact.isFavorite && (
                        <Star className="absolute -bottom-1 -right-1 w-3 h-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-foreground truncate">{contact.name}</h4>
                        <span className="text-xs text-muted-foreground">{contact.lastInteraction}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {getStatusLabel(contact.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          {selectedContact && (
            <Card className="shadow-card border-0 lg:col-span-2">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={selectedContact.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xl">
                          {selectedContact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(selectedContact.status)}`} />
                      {selectedContact.isFavorite && (
                        <Star className="absolute -bottom-1 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{selectedContact.name}</h2>
                      <Badge variant="secondary" className="mt-1">
                        {getStatusLabel(selectedContact.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <CustomerTagSelector 
                      customerId={selectedContact.id}
                      customerName={selectedContact.name}
                    />
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{selectedContact.phone}</span>
                        </div>
                        
                        {selectedContact.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{selectedContact.email}</span>
                          </div>
                        )}
                        
                        {selectedContact.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{selectedContact.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">Last contact: {selectedContact.lastInteraction}</span>
                        </div>
                      </div>
                    </div>

                    {/* Purchase History */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">Purchase History</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 bg-accent/20">
                          <div className="text-2xl font-bold text-primary">{selectedContact.totalOrders}</div>
                          <div className="text-sm text-muted-foreground">Total Orders</div>
                        </Card>
                        <Card className="p-4 bg-accent/20">
                          <div className="text-2xl font-bold text-primary">${selectedContact.totalSpent}</div>
                          <div className="text-sm text-muted-foreground">Total Spent</div>
                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* Notes and Actions */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">Notes</h3>
                      <Card className="p-4 bg-muted/20">
                        <p className="text-foreground text-sm">
                          {selectedContact.notes || 'No notes available for this contact.'}
                        </p>
                      </Card>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Phone className="h-4 w-4 mr-2" />
                          Make Call
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Contacts;