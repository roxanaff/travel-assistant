using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelAssistant.Migrations
{
    /// <inheritdoc />
    public partial class RenameBudgetItemsToExpenses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // This is a rename rather than a drop/create so current expense records and their links survive.
            migrationBuilder.DropForeignKey(name: "FK_BudgetItems_PlannedCosts_PlannedCostId", table: "BudgetItems");
            migrationBuilder.DropForeignKey(name: "FK_BudgetItems_Trips_TripId", table: "BudgetItems");
            migrationBuilder.DropPrimaryKey(name: "PK_BudgetItems", table: "BudgetItems");

            migrationBuilder.RenameTable(name: "BudgetItems", newName: "Expenses");
            migrationBuilder.RenameIndex(name: "IX_BudgetItems_PlannedCostId", table: "Expenses", newName: "IX_Expenses_PlannedCostId");
            migrationBuilder.RenameIndex(name: "IX_BudgetItems_TripId", table: "Expenses", newName: "IX_Expenses_TripId");

            migrationBuilder.AddPrimaryKey(name: "PK_Expenses", table: "Expenses", column: "Id");
            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_PlannedCosts_PlannedCostId",
                table: "Expenses",
                column: "PlannedCostId",
                principalTable: "PlannedCosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Trips_TripId",
                table: "Expenses",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Expenses_PlannedCosts_PlannedCostId", table: "Expenses");
            migrationBuilder.DropForeignKey(name: "FK_Expenses_Trips_TripId", table: "Expenses");
            migrationBuilder.DropPrimaryKey(name: "PK_Expenses", table: "Expenses");

            migrationBuilder.RenameTable(name: "Expenses", newName: "BudgetItems");
            migrationBuilder.RenameIndex(name: "IX_Expenses_PlannedCostId", table: "BudgetItems", newName: "IX_BudgetItems_PlannedCostId");
            migrationBuilder.RenameIndex(name: "IX_Expenses_TripId", table: "BudgetItems", newName: "IX_BudgetItems_TripId");

            migrationBuilder.AddPrimaryKey(name: "PK_BudgetItems", table: "BudgetItems", column: "Id");
            migrationBuilder.AddForeignKey(
                name: "FK_BudgetItems_PlannedCosts_PlannedCostId",
                table: "BudgetItems",
                column: "PlannedCostId",
                principalTable: "PlannedCosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
            migrationBuilder.AddForeignKey(
                name: "FK_BudgetItems_Trips_TripId",
                table: "BudgetItems",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
