import { Description, Field, Input, Label } from "@headlessui/react";

interface Props {
  name: string;
  label?: string;
  type: "text" | "date" | "number" | "email" | "password";
  description?: string;
  className?: string;
  placeholder?: string | number;
  defaultValue?: string | number;
}

export const InputField = ({
  name,
  label,
  type,
  description,
  className,
  placeholder,
  defaultValue,
}: Props) => {
  return (
    <Field className="w-full">
      <Label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </Label>
      {description && <Description>{description}</Description>}
      <Input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={String(placeholder)}
        className={`shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light ${className}`}
      />
    </Field>
  );
};
