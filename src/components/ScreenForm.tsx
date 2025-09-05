"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"

// Shadcn/UI
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Loader2, Upload, MapPin, CheckCircle, AlertCircle } from "lucide-react"

// Serviços
import { createScreen, ScreenFormData } from "@/lib/screen-service"
import { validateAddress } from "@/lib/geocoding"

// 🔹 Schema de validação
const screenSchema = z.object({
  code: z.string().min(2, "Código obrigatório"),
  name: z.string().min(2, "Nome obrigatório"),
  address_raw: z.string().min(3, "Endereço obrigatório"),
  city: z.string().optional(),
  state: z.string().optional(),
  cep: z.string().optional(),
  venue_id: z
    .string()
    .regex(/^\d*$/, "Deve ser um número")
    .optional(),
  file: z
    .any()
    .refine((f) => f?.length === 1, "Selecione uma imagem"),
})

type FormData = z.infer<typeof screenSchema>

// 🔹 Componente
export function ScreenForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidatingAddress, setIsValidatingAddress] = useState(false)
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(screenSchema),
    defaultValues: {
      code: "",
      name: "",
      address_raw: "",
      city: "",
      state: "",
      cep: "",
      venue_id: "",
      file: undefined,
    },
  })

  const { toast } = useToast()

  // Validar endereço em tempo real
  const validateAddressField = async (address: string) => {
    if (!address || address.length < 3) {
      setAddressValidation(null)
      return
    }

    setIsValidatingAddress(true)
    try {
      const isValid = await validateAddress(address)
      setAddressValidation({
        isValid,
        message: isValid 
          ? "Endereço válido ✓" 
          : "Endereço não encontrado. Verifique e tente novamente."
      })
    } catch (error) {
      setAddressValidation({
        isValid: false,
        message: "Erro ao validar endereço"
      })
    } finally {
      setIsValidatingAddress(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Validar endereço antes de prosseguir
      if (!addressValidation?.isValid) {
        toast({ 
          title: "❌ Endereço inválido", 
          description: "Por favor, verifique o endereço antes de continuar.",
          variant: "destructive" 
        })
        return
      }

      // Converter dados do formulário para o formato esperado pelo serviço
      const screenData: ScreenFormData = {
        code: data.code,
        name: data.name,
        address_raw: data.address_raw,
        city: data.city || undefined,
        state: data.state || undefined,
        cep: data.cep || undefined,
        venue_id: data.venue_id || undefined,
        file: data.file
      }

      // Criar tela usando o serviço
      const createdScreen = await createScreen(screenData)

      toast({ 
        title: "✅ Sucesso", 
        description: `Tela "${createdScreen.name}" cadastrada com sucesso!` 
      })
      
      form.reset()
      setAddressValidation(null)
      
    } catch (err: any) {
      console.error('Erro no cadastro:', err)
      
      let errorMessage = "Falha ao cadastrar tela"
      
      if (err.message.includes('Google Maps API Key')) {
        errorMessage = "Configuração da API do Google Maps não encontrada"
      } else if (err.message.includes('geocodificação')) {
        errorMessage = "Erro ao processar endereço. Verifique se o endereço está correto."
      } else if (err.message.includes('upload')) {
        errorMessage = "Erro no upload da imagem. Verifique o arquivo e tente novamente."
      } else if (err.message.includes('banco')) {
        errorMessage = "Erro ao salvar no banco de dados."
      }
      
      toast({ 
        title: "❌ Erro", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Cadastrar Nova Tela
        </CardTitle>
        <CardDescription>
          Preencha os dados da tela. O endereço será automaticamente geocodificado e a imagem será enviada para o servidor.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Código e Nome */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código da Tela</FormLabel>
                    <FormControl>
                      <Input placeholder="EX: IGUATEMI-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da tela" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Endereço com validação */}
            <FormField
              control={form.control}
              name="address_raw"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Rua, número, bairro, cidade, estado..." 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          // Validar endereço após 1 segundo de inatividade
                          const timeoutId = setTimeout(() => {
                            validateAddressField(e.target.value)
                          }, 1000)
                          return () => clearTimeout(timeoutId)
                        }}
                      />
                      
                      {/* Status da validação */}
                      {isValidatingAddress && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validando endereço...
                        </div>
                      )}
                      
                      {addressValidation && (
                        <div className={`flex items-center gap-2 text-sm ${
                          addressValidation.isValid ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {addressValidation.isValid ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {addressValidation.message}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cidade, Estado e CEP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="01234-567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ID do Venue */}
            <FormField
              control={form.control}
              name="venue_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Venue (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload de Imagem */}
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem da Tela</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => field.onChange(e.target.files)}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    Formatos aceitos: JPG, PNG, GIF. Máximo 10MB.
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botão de Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !addressValidation?.isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Cadastrar Tela"
              )}
            </Button>

            {/* Informações adicionais */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• O endereço será automaticamente geocodificado usando a Google Maps API</p>
              <p>• A imagem será enviada para o Supabase Storage</p>
              <p>• Coordenadas (lat/lng) e Google Place ID serão salvos automaticamente</p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
