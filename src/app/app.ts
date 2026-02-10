import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Navbar } from './components/layout/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Collection_Media_Fend';
}
