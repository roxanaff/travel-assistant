using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class UpdateItineraryActivities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EndTime",
                table: "ItineraryItems",
                newName: "OpeningTime");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "Date",
                table: "ItineraryItems",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "ItineraryItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "ClosingTime",
                table: "ItineraryItems",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "ItineraryItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalLink",
                table: "ItineraryItems",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "ItineraryItems",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "ItineraryItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClosingTime",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "ExternalLink",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "ItineraryItems");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "ItineraryItems");

            migrationBuilder.RenameColumn(
                name: "OpeningTime",
                table: "ItineraryItems",
                newName: "EndTime");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "Date",
                table: "ItineraryItems",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "ItineraryItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldNullable: true);
        }
    }
}
