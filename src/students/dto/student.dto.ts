import { IsString, IsEmail, IsEnum, IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateStudentDto {
  @IsString() first_name: string;
  @IsString() last_name: string;
  @IsEmail()  email: string;
  @IsOptional() @IsString() phone?: string;
  @IsDateString() date_of_birth: string;
  @IsEnum(['male','female','other','prefer_not_to_say']) gender: string;
  @IsString() course: string;
  @Type(() => Number) @IsNumber() @Min(1) @Max(12) semester: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(4) gpa?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() pincode?: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional() @IsEnum(['active','inactive','graduated','suspended']) status?: string;
}
