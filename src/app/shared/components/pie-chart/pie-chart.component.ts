import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pie-chart.component.html',
  styleUrl: './pie-chart.component.scss',
})
export class PieChartComponent {
  @Input() totalContributions: number = 0;
  @Input() totalDonations: number = 0;
  @Input() availableFunds: number = 0;

  chartData = computed(() => {
    const total = this.totalContributions + Math.abs(this.totalDonations);
    if (total === 0) {
      return {
        contributions: 0,
        donations: 0,
        contributionsPercent: 0,
        donationsPercent: 0,
        contributionsAngle: 0,
        donationsAngle: 0,
      };
    }

    const contributionsPercent = (this.totalContributions / total) * 100;
    const donationsPercent = (Math.abs(this.totalDonations) / total) * 100;

    return {
      contributions: this.totalContributions,
      donations: Math.abs(this.totalDonations),
      contributionsPercent: Math.round(contributionsPercent),
      donationsPercent: Math.round(donationsPercent),
      contributionsAngle: (contributionsPercent / 100) * 360,
      donationsAngle: (donationsPercent / 100) * 360,
    };
  });

  getContributionsPath(): string {
    const data = this.chartData();
    if (data.contributionsAngle === 0) return '';

    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    const startAngle = -90; // Start from top
    const endAngle = startAngle + data.contributionsAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = data.contributionsAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  getDonationsPath(): string {
    const data = this.chartData();
    if (data.donationsAngle === 0) return '';

    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    const startAngle = -90 + data.contributionsAngle;
    const endAngle = startAngle + data.donationsAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = data.donationsAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

