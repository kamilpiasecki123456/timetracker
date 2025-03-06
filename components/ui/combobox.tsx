"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "./input"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string, isCustomValue: boolean) => void
  placeholder?: string
  emptyText?: string
  className?: string
  allowCustomValue?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccione una opción",
  emptyText = "No hay resultados.",
  className,
  allowCustomValue = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Znajdź etykietę dla bieżącej wartości
  const selectedOption = options.find((option) => option.value === value)
  const displayValue = selectedOption?.label || value

  // Obsługa zmiany wartości wejściowej
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (allowCustomValue) {
      onValueChange(newValue, true)
    }
  }

  // Obsługa wyboru opcji z listy
  const handleSelectOption = (selectedValue: string) => {
    const option = options.find((opt) => opt.value === selectedValue)
    if (option) {
      onValueChange(option.value, false)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Input value={displayValue} onChange={handleInputChange} placeholder={placeholder} className="w-full pr-10" />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setOpen(!open)}
            type="button"
          >
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={handleSelectOption}>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

