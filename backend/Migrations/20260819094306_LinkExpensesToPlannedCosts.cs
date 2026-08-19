using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class LinkExpensesToPlannedCosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PlannedCostId",
                table: "BudgetItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BudgetItems_PlannedCostId",
                table: "BudgetItems",
                column: "PlannedCostId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BudgetItems_PlannedCosts_PlannedCostId",
                table: "BudgetItems",
                column: "PlannedCostId",
                principalTable: "PlannedCosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BudgetItems_PlannedCosts_PlannedCostId",
                table: "BudgetItems");

            migrationBuilder.DropIndex(
                name: "IX_BudgetItems_PlannedCostId",
                table: "BudgetItems");

            migrationBuilder.DropColumn(
                name: "PlannedCostId",
                table: "BudgetItems");
        }
    }
}
