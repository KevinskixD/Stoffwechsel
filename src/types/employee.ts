export interface Employee {
  id: string
  firstName: string
  lastName: string
  personnelNumber: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type EmployeeInput = Pick<Employee, 'firstName' | 'lastName' | 'personnelNumber'>

export function employeeDisplayName(employee: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${employee.lastName}, ${employee.firstName}`
}
