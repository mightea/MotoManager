"use client";

import { useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";

const formSchema = z.object({
  make: z.string().min(2, "Die Marke muss mindestens 2 Zeichen lang sein."),
  model: z.string().min(1, "Modell ist erforderlich."),
  purchaseDate: z.date({
    required_error: "Ein Kaufdatum ist erforderlich.",
  }),
  initialOdometer: z.coerce
    .number()
    .min(0, "Anfänglicher Kilometerstand ist erforderlich."),
  imageUrl: z
    .string()
    .url("Bitte gib eine gültige URL ein.")
    .optional()
    .or(z.literal("")),
});

type AddMotorcycleDialogProps = {
  children: ReactNode;
  onMotorcycleAdded?: (id: string) => void;
};

export function AddMotorcycleDialog({
  children,
  onMotorcycleAdded,
}: AddMotorcycleDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: "",
      model: "",
      initialOdometer: 0,
      imageUrl: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const newId = addMotorcycle({
      ...values,
      purchaseDate: values.purchaseDate.toISOString(),
      imageUrl: values.imageUrl || undefined,
    });
    form.reset();
    setOpen(false);
    if (onMotorcycleAdded) {
      onMotorcycleAdded(newId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Neues Motorrad hinzufügen</DialogTitle>
          <DialogDescription>
            Gib die Details für dein neues Motorrad ein, um es zu verfolgen.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marke</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Ducati" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modell</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Panigale V4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Kaufdatum</FormLabel>
                    <DatePicker value={field.value} onSelect={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anf. Kilometerstand (km)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="z.B. 1200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bild-URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://beispiel.de/bild.png"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit">Motorrad hinzufügen</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function addMotorcycle(arg0: {
  purchaseDate: string;
  imageUrl: string | undefined;
  make: string;
  model: string;
  initialOdometer: number;
}) {
  throw new Error("Function not implemented.");
}
