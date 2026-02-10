import { Component } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { RouterOutlet } from '@angular/router';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-layout',
  imports: [Navbar, RouterOutlet, Footer],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

}
