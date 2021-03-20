export interface Plugin {
  id: string;
  name: string;
  url: string;
}

export interface Instruction {
  name: string;
  description: string;
  instructionType: InstructionType;
}

export interface Section extends Instruction {
  isOptional: boolean;
  allowed: string;
  url: string;
  /** Instructions names recommended inside this Section */
  innerInstructions: string[];
}

export interface Step extends Instruction {
  command: string;
  plugin: string;
  parameters: Parameter[];
}

export interface Parameter extends Instruction {
  type: ParameterType;
  values: string[];
  isOptional: boolean;
}

export interface Variable extends Instruction {}

export interface Url {
  label: string;
  url: string;
  html: string;
}

export interface JenkinsData {
  date: string;
  plugins: Plugin[];
  instructions: Step[];
  sections: Section[];
  environmentVariables: Variable[];
}

export type ParameterType = 'String' | 'boolean' | 'Enum' | 'Nested' | 'unknown' | string;
export type InstructionType = 'Section' | 'Directive' | 'Step' | 'Parameter' | 'Variable' | string;
