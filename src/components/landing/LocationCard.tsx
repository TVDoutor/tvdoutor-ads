import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart, MapPin } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  type: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  main_specialties: string[];
  estimated_annual_impacts: number;
  audience_profile: string;
}

interface LocationCardProps {
  venue: Venue;
}

export function LocationCard({ venue }: LocationCardProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white">
      <h3 className="font-bold text-lg text-gray-800">{venue.name}</h3>
      <p className="text-sm text-gray-500 flex items-center mt-1">
        <MapPin className="w-4 h-4 mr-2" /> {venue.type}
      </p>
      
      <div className="mt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">Especialidades</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {venue.main_specialties.map(spec => 
            <Badge key={spec} variant="secondary">{spec}</Badge>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-start">
          <BarChart className="w-5 h-5 mr-2 text-indigo-600" />
          <div>
            <p className="font-semibold text-gray-700">
              {(venue.estimated_annual_impacts / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-gray-500">Impactos/ano</p>
          </div>
        </div>
        <div className="flex items-start">
          <Users className="w-5 h-5 mr-2 text-indigo-600" />
          <div>
            <p className="font-semibold text-gray-700">Classes A/B</p>
            <p className="text-xs text-gray-500">Perfil Principal</p>
          </div>
        </div>
      </div>
      
      <Button className="w-full mt-4">Adicionar à Cotação</Button>
    </div>
  )
}
